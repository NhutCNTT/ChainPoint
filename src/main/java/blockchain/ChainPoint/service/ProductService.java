package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.product.ProductRequest;
import blockchain.ChainPoint.dto.product.ProductResponse;

import java.util.List;

public interface ProductService {

    List<ProductResponse> getAllProducts(String category, String status);

    ProductResponse getProductById(Long id);

    ProductResponse createProduct(ProductRequest request);

    ProductResponse updateProduct(Long id, ProductRequest request);

    void deleteProduct(Long id);

    ProductResponse toggleStockStatus(Long id);
}
