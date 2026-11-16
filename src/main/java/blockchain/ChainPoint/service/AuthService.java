package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;
import blockchain.ChainPoint.dto.auth.RegisterRequest;
import blockchain.ChainPoint.dto.auth.RegisterResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    RegisterResponse register(RegisterRequest request);
}

