package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);
}
