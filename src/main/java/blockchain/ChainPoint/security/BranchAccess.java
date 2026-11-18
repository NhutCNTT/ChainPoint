package blockchain.ChainPoint.security;

import blockchain.ChainPoint.entity.User;
import blockchain.ChainPoint.entity.enums.RoleType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.util.LinkedHashSet;
import java.util.Set;

/** Database-backed request principal, never JWT/client branch claims, is authoritative. */
@Component
public class BranchAccess {
    public User user() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails details)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        if (!details.isEnabled()) throw new AccessDeniedException("Account disabled");
        return details.getUser();
    }

    public boolean isOwner() { return user().getRole() == RoleType.ROLE_OWNER; }

    public void requireManagement() {
        if (user().getRole() == RoleType.ROLE_CASHIER) throw new AccessDeniedException("Management access required");
    }

    public void requireOwner() {
        if (!isOwner()) throw new AccessDeniedException("Owner access required");
    }

    public Set<Long> branchIds() {
        User user = user();
        Set<Long> ids = new LinkedHashSet<>();
        if (user.getBranch() != null) ids.add(user.getBranch().getId());
        if (user.getRole() == RoleType.ROLE_MANAGER) user.getManagedBranches().forEach(b -> ids.add(b.getId()));
        return ids;
    }

    public boolean canAccess(Long branchId) {
        return isOwner() || (branchId != null && branchIds().contains(branchId));
    }

    public void check(Long branchId) {
        if (!canAccess(branchId)) throw new AccessDeniedException("Branch access denied");
    }

    /** Null means all branches only for OWNER. Other roles default to their primary/first assignment. */
    public Long resolve(Long requested) {
        if (requested != null) { check(requested); return requested; }
        if (isOwner()) return null;
        return branchIds().stream().findFirst().orElseThrow(() -> new AccessDeniedException("No branch assigned"));
    }

    public Long requireBranch(Long requested) {
        Long resolved = resolve(requested);
        if (resolved == null) throw new IllegalArgumentException("Select a branch");
        return resolved;
    }
}
