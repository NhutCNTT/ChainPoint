package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;
import blockchain.ChainPoint.dto.auth.RegisterRequest;

public interface AuthService {

    LoginResponse toLoginResponse(blockchain.ChainPoint.entity.User user);

    LoginResponse login(LoginRequest request);

    LoginResponse register(RegisterRequest request);
}
