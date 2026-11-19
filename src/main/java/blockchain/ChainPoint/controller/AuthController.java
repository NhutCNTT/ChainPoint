package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;
import blockchain.ChainPoint.dto.auth.RegisterRequest;
import blockchain.ChainPoint.dto.branch.BranchResponse;
import blockchain.ChainPoint.service.AuthService;
import blockchain.ChainPoint.service.BranchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final BranchService branchService;

    @org.springframework.beans.factory.annotation.Value("${jwt.expiration}")
    private long pageCookieExpiration;

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me(org.springframework.security.core.Authentication authentication) {
        var user = ((blockchain.ChainPoint.security.CustomUserDetails) authentication.getPrincipal()).getUser();
        return ResponseEntity.ok(authService.toLoginResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest servletRequest,
                                              jakarta.servlet.http.HttpServletResponse response) {
        LoginResponse result = authService.login(request);
        setPageCookie(result.getAccessToken(), servletRequest.isSecure(), response);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) {
        response.addHeader("Set-Cookie", org.springframework.http.ResponseCookie.from("cp_page", "")
                .httpOnly(true).secure(request.isSecure()).sameSite("Strict").path("/").maxAge(0).build().toString());
        return ResponseEntity.noContent().build();
    }

    private void setPageCookie(String token, boolean secure, jakarta.servlet.http.HttpServletResponse response) {
        response.addHeader("Set-Cookie", org.springframework.http.ResponseCookie.from("cp_page", token)
                .httpOnly(true).secure(secure).sameSite("Strict").path("/").maxAge(pageCookieExpiration / 1000).build().toString());
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request, jakarta.servlet.http.HttpServletRequest servletRequest,
                                                 jakarta.servlet.http.HttpServletResponse response) {
        LoginResponse result = authService.register(request);
        setPageCookie(result.getAccessToken(), servletRequest.isSecure(), response);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
}
