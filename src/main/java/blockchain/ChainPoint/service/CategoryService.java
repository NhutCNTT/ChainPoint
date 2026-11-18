package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.category.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getCategories();
}
