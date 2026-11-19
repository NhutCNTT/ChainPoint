package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.product.ProductRequest;
import blockchain.ChainPoint.dto.product.ProductResponse;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final blockchain.ChainPoint.repository.BranchRepository branchRepository;
    private final blockchain.ChainPoint.security.BranchAccess access;

    @Override
    public List<ProductResponse> getAllProducts(String category, String status, Long branchId) {
        return productRepository.findVisibleProducts(access.resolve(branchId)).stream()
                .filter(p -> !StringUtils.hasText(category) || category.equalsIgnoreCase(p.getCategory()))
                .filter(p -> !StringUtils.hasText(status) || status.equalsIgnoreCase(p.getStatus()))
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
        access.requireManagement();
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
                .branch(resolveBranch(request.getBranchId()))
                .build();

        return toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        checkWrite(product);
        if (request.getBranchId() != null && (product.getBranch() == null || !request.getBranchId().equals(product.getBranch().getId()))) {
            throw new IllegalArgumentException("Product branch cannot be changed");
        }

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
        Product product = findProduct(id);
        checkWrite(product);

        try {
            productRepository.delete(product);
            productRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateResourceException(
                    "Không thể xóa sản phẩm vì đã có hóa đơn tham chiếu. "
                            + "Hãy chuyển sản phẩm sang trạng thái 'out_of_stock' thay vì xóa."
            );
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse toggleStockStatus(Long id) {
        Product product = productRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        checkWrite(product);
        product.setStatus(
                STATUS_AVAILABLE.equalsIgnoreCase(product.getStatus())
                        ? STATUS_OUT_OF_STOCK
                        : STATUS_AVAILABLE
        );

        return toResponse(productRepository.save(product));
    }

    private Product findProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        if (product.getBranch() != null) access.check(product.getBranch().getId());
        return product;
    }

    private void checkWrite(Product product) {
        access.requireManagement();
        if (product.getBranch() == null) access.requireOwner();
        else access.check(product.getBranch().getId());
    }

    private blockchain.ChainPoint.entity.Branch resolveBranch(Long requested) {
        Long id = access.resolve(requested);
        if (id == null) return null;
        return branchRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
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
                .branchId(product.getBranch() == null ? null : product.getBranch().getId())
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
