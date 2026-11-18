package blockchain.ChainPoint.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.util.Objects;

@Component
public class BranchAccess {
    public CustomUserDetails principal() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails user)) {
            throw new AccessDeniedException("An authenticated staff account is required");
        }
        return user;
    }

    public boolean isOwner() {
        return principal().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OWNER"));
    }

    public Long scope(Long requested) {
        if (isOwner()) return requested;
        Long assigned = principal().getBranchId();
        if (assigned == null || (requested != null && !Objects.equals(assigned, requested))) {
            throw new AccessDeniedException("This branch is outside your assigned branch");
        }
        return assigned;
    }

    public void require(Long branchId) { scope(branchId); }
}
