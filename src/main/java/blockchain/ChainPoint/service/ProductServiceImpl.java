package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.product.ProductRequest;
import blockchain.ChainPoint.dto.product.ProductResponse;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private static final String STATUS_AVAILABLE = "available";
    private static final String STATUS_OUT_OF_STOCK = "out_of_stock";

    private final ProductRepository productRepository;

    @Override
    @Cacheable(
            value = "products",
            key = "#category != null ? #category : 'all'",
            condition = "#status == null"
    )
    public List<ProductResponse> getAllProducts(String category, String status) {
        List<Product> products;

        if (StringUtils.hasText(category)) {
            products = productRepository.findByCategoryIgnoreCase(category);
        } else if (StringUtils.hasText(status)) {
            products = productRepository.findByStatus(status);
        } else {
            products = productRepository.findAll();
        }

        if (StringUtils.hasText(category) && StringUtils.hasText(status)) {
            products = products.stream()
                    .filter(product -> status.equalsIgnoreCase(product.getStatus()))
                    .toList();
        }

        return products.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ProductResponse getProductById(Long id) {
        return toResponse(findProduct(id));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Product code already exists: " + request.getCode());
        }

        Product product = Product.builder()
                .code(request.getCode())
                .name(request.getName())
                .category(request.getCategory())
                .price(request.getPrice())
                .emoji(request.getEmoji())
                .status(defaultStatus(request.getStatus()))
                .stockQuantity(defaultStockQuantity(request.getStockQuantity()))
                .imageUrl(request.getImageUrl())
                .build();

        return toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = findProduct(id);

        if (!Objects.equals(product.getCode(), request.getCode())
                && productRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Product code already exists: " + request.getCode());
        }

        product.setCode(request.getCode());
        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setPrice(request.getPrice());
        product.setEmoji(request.getEmoji());
        product.setStatus(defaultStatus(request.getStatus()));
        product.setStockQuantity(defaultStockQuantity(request.getStockQuantity()));
        product.setImageUrl(request.getImageUrl());

        return toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void deleteProduct(Long id) {
        productRepository.delete(findProduct(id));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse toggleStockStatus(Long id) {
        Product product = findProduct(id);
        product.setStatus(
                STATUS_AVAILABLE.equalsIgnoreCase(product.getStatus())
                        ? STATUS_OUT_OF_STOCK
                        : STATUS_AVAILABLE
        );

        return toResponse(productRepository.save(product));
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private String defaultStatus(String status) {
        return StringUtils.hasText(status) ? status : STATUS_AVAILABLE;
    }

    private Integer defaultStockQuantity(Integer stockQuantity) {
        return stockQuantity != null ? stockQuantity : 0;
    }

    private ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .code(product.getCode())
                .name(product.getName())
                .category(product.getCategory())
                .price(product.getPrice())
                .status(product.getStatus())
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .emoji(product.getEmoji())
                .createdAt(product.getCreatedAt())
                .build();
    }
}
