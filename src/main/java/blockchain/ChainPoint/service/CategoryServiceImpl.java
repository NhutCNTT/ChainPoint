package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.category.CategoryResponse;
import blockchain.ChainPoint.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private static final Map<String, CategoryMeta> DEFAULT_META = new LinkedHashMap<>();

    static {
        DEFAULT_META.put("hot", new CategoryMeta("Món nóng", "🔥"));
        DEFAULT_META.put("cold", new CategoryMeta("Món lạnh", "🥗"));
        DEFAULT_META.put("drink", new CategoryMeta("Đồ uống", "🥤"));
        DEFAULT_META.put("dessert", new CategoryMeta("Tráng miệng", "🍰"));
        DEFAULT_META.put("other", new CategoryMeta("Món ăn kèm", "🍚"));
    }

    private final ProductRepository productRepository;

    @Override
    public List<CategoryResponse> getCategories() {
        return productRepository.findDistinctCategories().stream()
                .map(code -> {
                    CategoryMeta meta = DEFAULT_META.get(code);
                    return CategoryResponse.builder()
                            .code(code)
                            .name(meta != null ? meta.name() : code)
                            .icon(meta != null ? meta.icon() : "🍽️")
                            .build();
                })
                .toList();
    }

    private record CategoryMeta(String name, String icon) {
    }
}
