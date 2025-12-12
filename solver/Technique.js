import { state } from './state.js';
import { show_result, log_process, backup_original_board, restore_original_board, } from './core.js';
import { eliminate_candidates, eliminate_candidates_classic, isEqual, getCombinations, getRowLetter, get_all_regions, get_special_combination_regions, isValid } from './solver_tool.js';
import { get_all_mark_lines, get_cells_on_line } from "../modules/multi_diagonal.js";
import { is_valid_quadruple } from '../modules/quadruple.js';


export function solve_By_Elimination(board, size) {
    // 重置欠一数组状态
    state.box_missing_subsets = {};
    state.row_missing_subsets = {};
    state.col_missing_subsets = {};
    
    let changed;
    // 添加技巧使用计数器
    const technique_counts = {
        "唯余法_1": 0,
        "唯余法_2": 0,
        "唯余法_3": 0,
        "唯余法_4": 0,
        "唯余法_5": 0,
        "唯余法_6": 0,
        "唯余法_7": 0,
        "唯余法_8": 0,
        "唯余法_9": 0,
        "宫排除_1": 0,
        "宫排除_2": 0,
        "宫排除_3": 0,
        "宫排除_4": 0,
        "宫排除_5": 0,
        "宫排除_6": 0,
        "宫排除_7": 0,
        "宫排除_8": 0,
        "宫排除_9": 0,
        "行列排除_1": 0,
        "行列排除_2": 0,
        "行列排除_3": 0,
        "行列排除_4": 0,
        "行列排除_5": 0,
        "行列排除_6": 0,
        "行列排除_7": 0,
        "行列排除_8": 0,
        "行列排除_9": 0,
        "额外区域排除_1": 0,
        "额外区域排除_2": 0,
        "额外区域排除_3": 0,
        "额外区域排除_4": 0,
        "额外区域排除_5": 0,
        "额外区域排除_6": 0,
        "额外区域排除_7": 0,
        "额外区域排除_8": 0,
        "额外区域排除_9": 0,
        "宫区块_2": 0,
        "宫区块_3": 0,
        "宫区块_4": 0,
        "宫区块_5": 0,
        "宫区块_6": 0,
        "宫区块_7": 0,
        "宫区块_8": 0,
        "宫区块_9": 0,
        "变型宫区块_2": 0,
        "变型宫区块_3": 0,
        "变型宫区块_4": 0,
        "变型宫区块_5": 0,
        "变型宫区块_6": 0,
        "变型宫区块_7": 0,
        "变型宫区块_8": 0,
        "变型宫区块_9": 0,
        "行列区块_2": 0,
        "行列区块_3": 0,
        "行列区块_4": 0,
        "行列区块_5": 0,
        "行列区块_6": 0,
        "行列区块_7": 0,
        "行列区块_8": 0,
        "行列区块_9": 0,
        "变型行列区块_2": 0,
        "变型行列区块_3": 0,
        "变型行列区块_4": 0,
        "变型行列区块_5": 0,
        "变型行列区块_6": 0,
        "变型行列区块_7": 0,
        "变型行列区块_8": 0,
        "变型行列区块_9": 0,
        "额外区域区块_2": 0,
        "额外区域区块_3": 0,
        "额外区域区块_4": 0,
        "额外区域区块_5": 0,
        "额外区域区块_6": 0,
        "额外区域区块_7": 0,
        "额外区域区块_8": 0,
        "额外区域区块_9": 0,
        "变型额外区域区块_2": 0,
        "变型额外区域区块_3": 0,
        "变型额外区域区块_4": 0,
        "变型额外区域区块_5": 0,
        "变型额外区域区块_6": 0,
        "变型额外区域区块_7": 0,
        "变型额外区域区块_8": 0,
        "变型额外区域区块_9": 0,
        "特定组合排除_1": 0,
        "特定组合排除_2": 0,
        "特定组合排除_3": 0,
        "特定组合排除_4": 0,
        "多特定组合排除_1": 0,
        "多特定组合排除_2": 0,
        "多特定组合排除_3": 0,
        "多特定组合排除_4": 0,
        "特定组合区块_1": 0,
        "特定组合区块_2": 0,
        "特定组合区块_3": 0,
        "特定组合区块_4": 0,
        "多特定组合区块_1": 0,
        "多特定组合区块_2": 0,
        "多特定组合区块_3": 0,
        "多特定组合区块_4": 0,
        "一刀流宫排除": 0,
        "一刀流宫区块": 0,
        "宫组合区块": 0,
        "额外区域组合区块": 0,
        "特定组合区块": 0,
        "多特定组合区块": 0,
        "宫显性数对": 0,
        "行列显性数对": 0,
        "额外区域显性数对": 0,
        "宫显性三数组": 0,
        "行列显性三数组": 0,
        "额外区域显性三数组": 0,
        "宫显性四数组": 0,
        "行列显性四数组": 0,
        "额外区域显性四数组": 0,
        "宫隐性数对": 0,
        "行列隐性数对": 0,
        "额外区域隐性数对": 0,
        "宫隐性三数组": 0,
        "行列隐性三数组": 0,
        "额外区域隐性三数组": 0,
        "宫隐性四数组": 0,
        "行列隐性四数组": 0,
        "额外区域隐性四数组": 0,
        "欠一排除": 0
    };

    let total_score = 0;
    // 技巧分值表
    const technique_scores = {
        // 唯余法分值细分，行列排除法分值细分，额外区域排除法分值细分
        "唯余法_1": 1,
        "唯余法_2": 2,
        "唯余法_3": 5,
        "唯余法_4": 30,
        "唯余法_5": 50,
        "唯余法_6": 80,
        "唯余法_7": 90,
        "唯余法_8": 100,
        "唯余法_9": 110,
        "宫排除_1": 2,
        "宫排除_2": 2,
        "宫排除_3": 2,
        "宫排除_4": 2,
        "宫排除_5": 2,
        "宫排除_6": 2,
        "宫排除_7": 2,
        "宫排除_8": 2,
        "宫排除_9": 2,
        "行列排除_1": 1,
        "行列排除_2": 2,
        "行列排除_3": 5,
        "行列排除_4": 30,
        "行列排除_5": 50,
        "行列排除_6": 80,
        "行列排除_7": 90,
        "行列排除_8": 100,
        "行列排除_9": 110,
        "额外区域排除_1": 1,
        "额外区域排除_2": 2,
        "额外区域排除_3": 5,
        "额外区域排除_4": 30,
        "额外区域排除_5": 50,
        "额外区域排除_6": 80,
        "额外区域排除_7": 90,
        "额外区域排除_8": 100,
        "额外区域排除_9": 110,
        "宫区块_2": 10,
        "宫区块_3": 12,
        "宫区块_4": 14,
        "宫区块_5": 16,
        "宫区块_6": 18,
        "宫区块_7": 20,
        "宫区块_8": 22,
        "宫区块_9": 24,
        "变型宫区块_2": 20,
        "变型宫区块_3": 24,
        "变型宫区块_4": 28,
        "变型宫区块_5": 32,
        "变型宫区块_6": 36,
        "变型宫区块_7": 40,
        "变型宫区块_8": 44,
        "变型宫区块_9": 48,
        "额外区域区块_2": 15,
        "额外区域区块_3": 18,
        "额外区域区块_4": 21,
        "额外区域区块_5": 24,
        "额外区域区块_6": 27,
        "额外区域区块_7": 30,
        "额外区域区块_8": 33,
        "额外区域区块_9": 36,
        "变型额外区域区块_2": 30,
        "变型额外区域区块_3": 36,
        "变型额外区域区块_4": 42,
        "变型额外区域区块_5": 48,
        "变型额外区域区块_6": 54,
        "变型额外区域区块_7": 60,
        "变型额外区域区块_8": 66,
        "变型额外区域区块_9": 72,
        "行列区块_2": 40,
        "行列区块_3": 48,
        "行列区块_4": 56,
        "行列区块_5": 64,
        "行列区块_6": 72,
        "行列区块_7": 80,
        "行列区块_8": 88,
        "行列区块_9": 96,
        "变型行列区块_2": 80,
        "变型行列区块_3": 96,
        "变型行列区块_4": 112,
        "变型行列区块_5": 128,
        "变型行列区块_6": 144,
        "变型行列区块_7": 160,
        "变型行列区块_8": 176,
        "变型行列区块_9": 192,
        // 其他技巧分值
        "特定组合排除_1": 5,
        "特定组合排除_2": 30,
        "特定组合排除_3": 50,
        "特定组合排除_4": 80,
        "多特定组合排除_1": 30,
        "多特定组合排除_2": 50,
        "多特定组合排除_3": 80,
        "多特定组合排除_4": 120,
        "特定组合区块_1": 15,
        "特定组合区块_2": 40,
        "特定组合区块_3": 70,
        "特定组合区块_4": 100,
        "多特定组合区块_1": 40,
        "多特定组合区块_2": 70,
        "多特定组合区块_3": 100,
        "多特定组合区块_4": 150,
        "一刀流宫排除": 2,
        "一刀流宫区块": 10,
        "宫隐性数对": 30,
        "额外区域隐性数对": 40,
        "宫组合区块": 40,
        "额外区域组合区块": 40,
        "宫隐性三数组": 70,
        "额外区域隐性三数组": 100,
        "宫显性数对": 80,
        "行列显性数对": 90,
        "额外区域显性数对": 120,
        "行列隐性数对": 200,
        "宫显性三数组": 250,
        "行列显性三数组": 300,
        "额外区域显性三数组": 340,
        "宫隐性四数组": 350,
        "行列隐性三数组": 400,
        "宫显性四数组": 500,
        "行列显性四数组": 550,
        "额外区域显性四数组": 550,
        "行列隐性四数组": 600,
        "额外区域隐性四数组": 600,

        // 欠一排除分值细分
        "欠一宫数对": 200,
        "欠一宫三数组": 400,
        "欠一宫四数组": 600,
        "欠一行列数对": 400,
        "欠一行列三数组": 600,
        "欠一行列四数组": 800,
    };

    // const techniqueGroups = [
    //     // 第一优先级：余1数的唯余法
    //     [() => state.techniqueSettings?.Cell_Elimination_1 && check_cell_elimination(board, size, 1)],
    //     // 第二优先级：余2数的唯余法
    //     [() => state.techniqueSettings?.Cell_Elimination_2 && check_cell_elimination(board, size, 2)],
    //     // // 特定组合排除
    //     // [() => state.techniqueSettings?.Special_Combination_Region_Elimination && check_special_combination_region_elimination(board, size)],
        
        
    //     // 第三优先级：宫排除法
    // ...Array.from({length: size}, (_, i) => [() => state.techniqueSettings?.Box_Elimination && check_Box_Elimination(board, size, i + 1)]),
    //     [() => state.techniqueSettings?.Box_One_Cut && check_Box_Elimination_One_Cut(board, size)],
    //     // 第三优先级：额外区域排除法
    // ...Array.from({length: size}, (_, i) => [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Elimination && check_Extra_Region_Elimination(board, size, i + 1)]),
    //     // 第四优先级：余3数的唯余法
    //     [() => state.techniqueSettings?.Cell_Elimination_3 && check_cell_elimination(board, size, 3)],
    //     // 第五优先级：行列排除法
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 1)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 2)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 3)],
    //     // 余1特定组合排除
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_1 && check_special_combination_region_elimination(board, size, 1)],
    //     // 余2特定组合排除
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_2 && check_special_combination_region_elimination(board, size, 2)],
    //     // 余3特定组合排除
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_3 && check_special_combination_region_elimination(board, size, 3)],



        
        
        

    //     // 第六优先级：宫区块，额外区域区块
    //     [() => state.techniqueSettings?.Box_Block && check_box_block_elimination(board, size)],
    //     // 变型宫区块
    //     [() => state.techniqueSettings?.Variant_Box_Block && check_box_block_elimination(board, size, false)],
    //     [() => state.techniqueSettings?.Box_Block_One_Cut && check_box_block_elimination_One_Cut(board, size)],
    //     // 额外区域区块
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Block && check_Extra_Region_Block_Elimination(board, size)],
    //     // 变型额外区域区块
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Variant_Extra_Region_Block && check_Extra_Region_Block_Elimination(board, size, false)],
    //     // 特定组合区块1-3
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_1 && check_special_combination_region_block_elimination(board, size, 1)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_2 && check_special_combination_region_block_elimination(board, size, 2)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_3 && check_special_combination_region_block_elimination(board, size, 3)],
        
        
    //     // 第七优先级：组合区块
    //     [() => state.techniqueSettings?.Box_Pair_Block && check_box_pair_block_elimination(board, size)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Pair_Block && check_extra_region_pair_block_elimination(board, size)],
    //     // 余4-9特定组合排除（放在同一组下）
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 4)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 5)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 9)],



    //     // 第八优先级：余4，5数的所有排除法
    //     [() => state.techniqueSettings?.Cell_Elimination_4 && check_cell_elimination(board, size, 4)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 4)],

    //     [() => state.techniqueSettings?.Cell_Elimination_5 && check_cell_elimination(board, size, 5)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 5)],

    //     // 第九优先级：行列区块
    //     [() => state.techniqueSettings?.Row_Col_Block && check_Row_Col_Block_Elimination(board, size)],
    //     // 变型行列区块
    //     [() => state.techniqueSettings?.Variant_Row_Col_Block && check_Row_Col_Block_Elimination(board, size, false)],
    //     // 特定组合区块4-9
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 4)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 5)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 9)],





    //     // 第十优先级：宫隐性数对，额外区域隐性数对
    //     [() => state.techniqueSettings?.Box_Hidden_Pair && check_box_hidden_subset_elimination(board, size, 2)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Pair && check_extra_region_hidden_subset_elimination(board, size, 2)],
    //     // 第十一优先级：余6-9数的所有排除法
    //     [() => state.techniqueSettings?.Cell_Elimination_6 && check_cell_elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Cell_Elimination_7 && check_cell_elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Cell_Elimination_8 && check_cell_elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Cell_Elimination_9 && check_cell_elimination(board, size, 9)],
    //     [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 9)],
    //     // 多特定组合排除
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_1 && check_multi_special_combination_region_elimination(board, size, 1)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_2 && check_multi_special_combination_region_elimination(board, size, 2)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_3 && check_multi_special_combination_region_elimination(board, size, 3)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 4)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 5)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 9)],
    //     // 多特定组合区块
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_1 && check_multi_special_combination_region_block_elimination(board, size, 1)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_2 && check_multi_special_combination_region_block_elimination(board, size, 2)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_3 && check_multi_special_combination_region_block_elimination(board, size, 3)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 4)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 5)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 6)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 7)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 8)],
    //     [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 9)],
    //     // 第十二优先级：宫隐性三数组，额外区域隐性三数组
    //     [() => state.techniqueSettings?.Box_Hidden_Triple && check_box_hidden_subset_elimination(board, size, 3)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Triple && check_extra_region_hidden_subset_elimination(board, size, 3)],
    //     // 第十三优先级：宫显性数对，额外区域显性数对
    //     [() => state.techniqueSettings?.Box_Naked_Pair && check_box_naked_subset_elimination(board, size, 2)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Pair && check_extra_region_naked_subset_elimination(board, size, 2)],
    //     // 第十四优先级：行列显性数对
    //     [() => (state.techniqueSettings?.Row_Col_Naked_Pair) && check_row_col_naked_subset_elimination(board, size, 2)],
        

    //     // 第十四点五优先级：宫隐性欠一数对
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 2)],//缺一门宫隐性欠一数对
    //     // 第十五优先级：行列隐性数对
    //     [() => (state.techniqueSettings?.Row_Col_Hidden_Pair) && check_row_col_hidden_subset_elimination(board, size, 2)],
        
    //     // 第十六优先级：行列隐性三数组
    //     [() => (state.techniqueSettings?.Row_Col_Hidden_Triple) && check_row_col_hidden_subset_elimination(board, size, 3)],
        
    //     // 第十六点五优先级：行列隐性欠一数对
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 2)],//缺一门行列隐性欠一数对
    //     // 第十七优先级：宫显性三数组，额外区域显性三数组
    //     [() => state.techniqueSettings?.Box_Naked_Triple && check_box_naked_subset_elimination(board, size, 3)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Triple && check_extra_region_naked_subset_elimination(board, size, 3)],
    //     // 第十八优先级：行列显性三数组
    //     [() => (state.techniqueSettings?.Row_Col_Naked_Triple) && check_row_col_naked_subset_elimination(board, size, 3)],
    //     // 第十八点五优先级：宫行列隐性欠一三数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 3)],//缺一门宫隐性欠一三数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 3)],//缺一门行列隐性欠一三数组




    //     // 第十九优先级：宫隐性四数组，额外区域隐性四数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],//缺一门宫隐性欠一四数组
    //     [() => state.techniqueSettings?.Box_Hidden_Quad && check_box_hidden_subset_elimination(board, size, 4)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Quad && check_extra_region_hidden_subset_elimination(board, size, 4)],
    //     // 第二十优先级：行列隐性四数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],
    //     [() => (state.techniqueSettings?.Row_Col_Hidden_Quad) && check_row_col_hidden_subset_elimination(board, size, 4)],
        

    //     // 第二十一优先级：宫显性四数组，额外区域显性四数组
    //     [() => state.techniqueSettings?.Box_Naked_Quad && check_box_naked_subset_elimination(board, size, 4)],
    //     [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Quad && check_extra_region_naked_subset_elimination(board, size, 4)],
    //     // 第二十二优先级：行列显性四数组
    //     [() => (state.techniqueSettings?.Row_Col_Naked_Quad) && check_row_col_naked_subset_elimination(board, size, 4)],
        
    //     // 第二十二点五优先级：宫行列隐性欠一四数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],//缺一门宫隐性欠一四数组
    //     [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],//缺一门行列隐性欠一四数组

    // ];
    const techniqueGroups = [
        // ==================== 第一优先级组（基础排除）====================
        // 唯余法_1
        [() => state.techniqueSettings?.Cell_Elimination_1 && check_cell_elimination(board, size, 1)],
        // 唯余法_2
        [() => state.techniqueSettings?.Cell_Elimination_2 && check_cell_elimination(board, size, 2)],
        
        // 宫排除_1-size
        ...Array.from({length: size}, (_, i) => {
            const f = () => state.techniqueSettings?.Box_Elimination && check_Box_Elimination(board, size, i + 1);
            f.nat = i + 1; // 这里nat代表第几宫
            return [f];
        }),
        // 一刀流宫排除
        [() => state.techniqueSettings?.Box_One_Cut && check_Box_Elimination_One_Cut(board, size)],
        // 额外区域排除_1-size
        ...Array.from({length: size}, (_, i) => {
            const f = () => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Elimination && check_Extra_Region_Elimination(board, size, i + 1);
            f.nat = i + 1;
            return [f];
        }),
        // 唯余法_3
        [() => state.techniqueSettings?.Cell_Elimination_3 && check_cell_elimination(board, size, 3)],
        // 行列排除_1-3
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 1)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 2)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 3)],
        // 特定组合排除_1
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_1 && check_special_combination_region_elimination(board, size, 1)],
        // 特定组合排除_2
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_2 && check_special_combination_region_elimination(board, size, 2)],
        // 特定组合排除_3
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_3 && check_special_combination_region_elimination(board, size, 3)],

        // ==================== 第二优先级组（区块类）====================
        // 宫区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Box_Block && check_box_block_elimination(board, size, i + 2, true);
            f.nat = i + 2;
            return [f];
        }),
        // 变型宫区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Variant_Box_Block && check_box_block_elimination(board, size, i + 2, false);
            f.nat = i + 2;
            return [f];
        }),
        // 一刀流宫区块
        [() => state.techniqueSettings?.Box_Block_One_Cut && check_box_block_elimination_One_Cut(board, size)],
        // 额外区域区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Extra_Region_Block && check_Extra_Region_Block_Elimination(board, size, i + 2, true);
            f.nat = i + 2;
            return [f];
        }),
        // 变型额外区域区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Variant_Extra_Region_Block && check_Extra_Region_Block_Elimination(board, size, i + 2, false);
            f.nat = i + 2;
            return [f];
        }),
        // 特定组合区块_1-3
        [() => state.techniqueSettings?.Special_Combination_Region_Block_1 && check_special_combination_region_block_elimination(board, size, 1)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_2 && check_special_combination_region_block_elimination(board, size, 2)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_3 && check_special_combination_region_block_elimination(board, size, 3)],
        // 宫组合区块
        [() => state.techniqueSettings?.Box_Pair_Block && check_box_pair_block_elimination(board, size)],
        // 额外区域组合区块
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Pair_Block && check_extra_region_pair_block_elimination(board, size)],
        // 特定组合排除_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 9)],
        // 唯余法_4 + 行列排除_4
        [() => state.techniqueSettings?.Cell_Elimination_4 && check_cell_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 4)],
        // 唯余法_5 + 行列排除_5
        [() => state.techniqueSettings?.Cell_Elimination_5 && check_cell_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 5)],
        // 行列区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Row_Col_Block && check_Row_Col_Block_Elimination(board, size, i + 2, true);
            f.nat = i + 2;
            return [f];
        }),
        // 变型行列区块_2-size
        ...Array.from({length: size - 1}, (_, i) => {
            const f = () => state.techniqueSettings?.Variant_Row_Col_Block && check_Row_Col_Block_Elimination(board, size, i + 2, false);
            f.nat = i + 2;
            return [f];
        }),
        // 特定组合区块_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 9)],

        // ==================== 第三优先级组（隐性数对+高级排除）====================
        // 宫隐性数对
        [() => state.techniqueSettings?.Box_Hidden_Pair && check_box_hidden_subset_elimination(board, size, 2)],
        // 额外区域隐性数对
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Pair && check_extra_region_hidden_subset_elimination(board, size, 2)],
        // 唯余法_6-9 + 行列排除_6-9
        [() => state.techniqueSettings?.Cell_Elimination_6 && check_cell_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 6)],
        [() => state.techniqueSettings?.Cell_Elimination_7 && check_cell_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 7)],
        [() => state.techniqueSettings?.Cell_Elimination_8 && check_cell_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 8)],
        [() => state.techniqueSettings?.Cell_Elimination_9 && check_cell_elimination(board, size, 9)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 9)],
        // 多特定组合排除_1-9
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_1 && check_multi_special_combination_region_elimination(board, size, 1)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_2 && check_multi_special_combination_region_elimination(board, size, 2)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_3 && check_multi_special_combination_region_elimination(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 9)],
        // 多特定组合区块_1-9
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_1 && check_multi_special_combination_region_block_elimination(board, size, 1)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_2 && check_multi_special_combination_region_block_elimination(board, size, 2)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_3 && check_multi_special_combination_region_block_elimination(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 9)],

        // ==================== 第四优先级组（三数组+显性数对）====================
        // 宫隐性三数组
        [() => state.techniqueSettings?.Box_Hidden_Triple && check_box_hidden_subset_elimination(board, size, 3)],
        // 额外区域隐性三数组
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Triple && check_extra_region_hidden_subset_elimination(board, size, 3)],
        // 宫显性数对
        [() => state.techniqueSettings?.Box_Naked_Pair && check_box_naked_subset_elimination(board, size, 2)],
        // 额外区域显性数对
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Pair && check_extra_region_naked_subset_elimination(board, size, 2)],
        // 行列显性数对
        [() => (state.techniqueSettings?.Row_Col_Naked_Pair) && check_row_col_naked_subset_elimination(board, size, 2)],
        // 欠一宫数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 2)],
        // 行列隐性数对
        [() => (state.techniqueSettings?.Row_Col_Hidden_Pair) && check_row_col_hidden_subset_elimination(board, size, 2)],
        // 行列隐性三数组
        [() => (state.techniqueSettings?.Row_Col_Hidden_Triple) && check_row_col_hidden_subset_elimination(board, size, 3)],
        // 欠一行列数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 2)],
        // 宫显性三数组
        [() => state.techniqueSettings?.Box_Naked_Triple && check_box_naked_subset_elimination(board, size, 3)],
        // 额外区域显性三数组
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Triple && check_extra_region_naked_subset_elimination(board, size, 3)],
        // 行列显性三数组
        [() => (state.techniqueSettings?.Row_Col_Naked_Triple) && check_row_col_naked_subset_elimination(board, size, 3)],
        // 欠一宫三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 3)],
        // 欠一行列三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 3)],

        // ==================== 第五优先级组（四数组）====================
        // 欠一宫四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],
        // 宫隐性四数组
        [() => state.techniqueSettings?.Box_Hidden_Quad && check_box_hidden_subset_elimination(board, size, 4)],
        // 额外区域隐性四数组
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Hidden_Quad && check_extra_region_hidden_subset_elimination(board, size, 4)],
        // 欠一行列四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],
        // 行列隐性四数组
        [() => (state.techniqueSettings?.Row_Col_Hidden_Quad) && check_row_col_hidden_subset_elimination(board, size, 4)],
        // 宫显性四数组
        [() => state.techniqueSettings?.Box_Naked_Quad && check_box_naked_subset_elimination(board, size, 4)],
        // 额外区域显性四数组
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Naked_Quad && check_extra_region_naked_subset_elimination(board, size, 4)],
        // 行列显性四数组
        [() => (state.techniqueSettings?.Row_Col_Naked_Quad) && check_row_col_naked_subset_elimination(board, size, 4)],

    ];
    do {
        changed = false;
        const initialBoard = JSON.parse(JSON.stringify(board));

        // 按优先级顺序执行技巧组
        for (let i = 0; i < techniqueGroups.length; i++) {
            const group = techniqueGroups[i];
            let groupChanged = false;
            
            do {
                groupChanged = false;
                const groupInitialBoard = JSON.parse(JSON.stringify(board));

                for (const technique of group) {
                    const result = technique();
                    if (result === true) {
                        if (!state.silentMode) log_process("[冲突检测] 发现无解局面");
                        return { changed: false, hasEmptyCandidate: true, technique_counts };
                    }
                    if (!groupChanged && !isEqual(board, groupInitialBoard)) {
                        groupChanged = true;
                        // 根据技巧名称增加计数器和分值
                        const technique_name = technique.toString().match(/state\.techniqueSettings\?\.(\w+)/)?.[1];
                        // 优先从函数属性获取nat，否则尝试从源码正则匹配（兼容静态调用）
                        let nat = technique.nat || technique.toString().match(/check_\w+\(([^,]+),\s*[^,]+,\s*(\d+)/)?.[2]; 
                        if (technique_name) {
                            let chinese_name;
                            let score_key;
                            if (technique_name.startsWith('Cell_Elimination_')) {
                                chinese_name = `唯余法_${technique_name.split('_')[2]}`;
                                score_key = `唯余法_${technique_name.split('_')[2]}`;
                            } else if (technique_name.startsWith('Special_Combination_Region_Elimination_')) {
                                chinese_name = `特定组合排除_${technique_name.split('_')[4]}`;
                                score_key = `特定组合排除_${technique_name.split('_')[4]}`;
                            } else if (technique_name.startsWith('Multi_Special_Combination_Region_Elimination_')) {
                                chinese_name = `多特定组合排除_${technique_name.split('_')[5]}`;
                                score_key = `多特定组合排除_${technique_name.split('_')[5]}`;
                            } else if (technique_name.startsWith('Special_Combination_Region_Block_')) {
                                chinese_name = `特定组合区块_${technique_name.split('_')[4]}`;
                                score_key = `特定组合区块_${technique_name.split('_')[4]}`;
                            } else if (technique_name.startsWith('Multi_Special_Combination_Region_Block_')) {
                                chinese_name = `多特定组合区块_${technique_name.split('_')[5]}`;
                                score_key = `多特定组合区块_${technique_name.split('_')[5]}`;
                            } else {
                                // 映射英文名到中文名
                                switch(technique_name) {
                                    case 'Row_Col_Elimination':
                                        chinese_name = `行列排除_${nat}`;
                                        score_key = `行列排除_${nat}`;
                                        break;
                                    case 'Extra_Region_Elimination':
                                        chinese_name = `额外区域排除_${nat}`;
                                        score_key = `额外区域排除_${nat}`;
                                        break;
                                    case 'Missing_One':
                                        // 判断当前调用的是哪个函数和nat参数
                                        if (technique.toString().includes('check_Box_Missing_One_Subset_Elimination')) {
                                            if (nat == 2) {
                                                chinese_name = "欠一宫数对";
                                                score_key = "欠一宫数对";
                                            } else if (nat == 3) {
                                                chinese_name = "欠一宫三数组";
                                                score_key = "欠一宫三数组";
                                            } else if (nat == 4) {
                                                chinese_name = "欠一宫四数组";
                                                score_key = "欠一宫四数组";
                                            }
                                        } else if (technique.toString().includes('check_Row_Col_Missing_One_Subset_Elimination')) {
                                            if (nat == 2) {
                                                chinese_name = "欠一行列数对";
                                                score_key = "欠一行列数对";
                                            } else if (nat == 3) {
                                                chinese_name = "欠一行列三数组";
                                                score_key = "欠一行列三数组";
                                            } else if (nat == 4) {
                                                chinese_name = "欠一行列四数组";
                                                score_key = "欠一行列四数组";
                                            }
                                        }
                                        break;
                                    case 'Box_Elimination':
                                        chinese_name = `宫排除_${nat}`;
                                        score_key = `宫排除_${nat}`;
                                        break;
                                    case 'Box_One_Cut':
                                        chinese_name = "一刀流宫排除";
                                        score_key = "一刀流宫排除";
                                        break;
                                    // case 'Row_Col_Elimination': chinese_name = "行列排除"; break;
                                    case 'Box_Block':
                                        chinese_name = `宫区块_${nat}`;
                                        score_key = `宫区块_${nat}`;
                                        break;
                                    case 'Variant_Box_Block':
                                        chinese_name = `变型宫区块_${nat}`;
                                        score_key = `变型宫区块_${nat}`;
                                        break;
                                    case 'Box_Block_One_Cut':
                                        chinese_name = "一刀流宫区块";
                                        score_key = "一刀流宫区块";
                                        break;
                                    case 'Box_Pair_Block':
                                        chinese_name = "宫组合区块";
                                        score_key = "宫组合区块";
                                        break;
                                    case 'Extra_Region_Pair_Block':
                                        chinese_name = "额外区域组合区块";
                                        score_key = "额外区域组合区块";
                                        break;
                                    case 'Row_Col_Block':
                                        chinese_name = `行列区块_${nat}`;
                                        score_key = `行列区块_${nat}`;
                                        break;
                                    case 'Variant_Row_Col_Block':
                                        chinese_name = `变型行列区块_${nat}`;
                                        score_key = `变型行列区块_${nat}`;
                                        break;
                                    case 'Extra_Region_Block':
                                        chinese_name = `额外区域区块_${nat}`;
                                        score_key = `额外区域区块_${nat}`;
                                        break;
                                    case 'Variant_Extra_Region_Block':
                                        chinese_name = `变型额外区域区块_${nat}`;
                                        score_key = `变型额外区域区块_${nat}`;
                                        break;
                                    case 'Box_Naked_Pair':
                                        chinese_name = "宫显性数对";
                                        score_key = "宫显性数对";
                                        break;
                                    case 'Row_Col_Naked_Pair':
                                        chinese_name = "行列显性数对";
                                        score_key = "行列显性数对";
                                        break;
                                    case 'Extra_Region_Naked_Pair':
                                        chinese_name = "额外区域显性数对";
                                        score_key = "额外区域显性数对";
                                        break;
                                    case 'Box_Naked_Triple':
                                        chinese_name = "宫显性三数组";
                                        score_key = "宫显性三数组";
                                        break;
                                    case 'Row_Col_Naked_Triple':
                                        chinese_name = "行列显性三数组";
                                        score_key = "行列显性三数组";
                                        break;
                                    case 'Extra_Region_Naked_Triple':
                                        chinese_name = "额外区域显性三数组";
                                        score_key = "额外区域显性三数组";
                                        break;
                                    case 'Box_Naked_Quad':
                                        chinese_name = "宫显性四数组";
                                        score_key = "宫显性四数组";
                                        break;
                                    case 'Row_Col_Naked_Quad':
                                        chinese_name = "行列显性四数组";
                                        score_key = "行列显性四数组";
                                        break;
                                    case 'Extra_Region_Naked_Quad':
                                        chinese_name = "额外区域显性四数组";
                                        score_key = "额外区域显性四数组";
                                        break;
                                    case 'Box_Hidden_Pair':
                                        chinese_name = "宫隐性数对";
                                        score_key = "宫隐性数对";
                                        break;
                                    case 'Row_Col_Hidden_Pair':
                                        chinese_name = "行列隐性数对";
                                        score_key = "行列隐性数对";
                                        break;
                                    case 'Extra_Region_Hidden_Pair':
                                        chinese_name = "额外区域隐性数对";
                                        score_key = "额外区域隐性数对";
                                        break;
                                    case 'Box_Hidden_Triple':
                                        chinese_name = "宫隐性三数组";
                                        score_key = "宫隐性三数组";
                                        break;
                                    case 'Row_Col_Hidden_Triple':
                                        chinese_name = "行列隐性三数组";
                                        score_key = "行列隐性三数组";
                                        break;
                                    case 'Extra_Region_Hidden_Triple':
                                        chinese_name = "额外区域隐性三数组";
                                        score_key = "额外区域隐性三数组";
                                        break;
                                    case 'Row_Col_Hidden_Quad':
                                        chinese_name = "行列隐性四数组";
                                        score_key = "行列隐性四数组";
                                        break;
                                    case 'Extra_Region_Hidden_Quad':
                                        chinese_name = "额外区域隐性四数组";
                                        score_key = "额外区域隐性四数组";
                                        break;
                                    //
                                    // case 'Missing_One': chinese_name = "欠一排除"; break;
                                    default: chinese_name = null;
                                }
                            }
                            if (chinese_name) {
                                technique_counts[chinese_name]++;
                                total_score += technique_scores[score_key] || 0;
                            }

                        }

                    }
                }

                if (groupChanged) {
                    changed = true;
                    i = -1; // 重置循环
                    break;
                }
            } while (groupChanged);
        }
    } while (changed);

    return { changed, hasEmptyCandidate: false, technique_counts, total_score };
}

/**
 * 通用区域排除法核心函数
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {string} region_type - 区域类型（如 '宫', '行', '列', '对角线'）
 * @param {number} region_index - 区域编号（如第几宫/行/列/对角线，1开始）
 * @param {number} nat - 余数参数（默认1）
 * @returns {boolean|undefined} 是否有冲突
 */
function region_elimination(board, size, region_cells, region_type, region_index, nat = 1) {
    let has_conflict = false;
    const existing_nums = new Set();
    // 统计区域内已存在的数字
    for (const [r, c] of region_cells) {
        if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
            existing_nums.add(board[r][c]);
        }
    }
    for (let num = 1; num <= size; num++) {
        // 新增：quadruple模式特殊处理
        if (state.current_mode === 'quadruple' && (region_type === '有重复四格提示' || region_type === '无重复四格提示')) {
            // 获取提示数
            const region = get_all_regions(size, state.current_mode).find(r => r.type === region_type && r.index === region_index);
            if (region && Array.isArray(region.clue_nums)) {
                // num必须在提示数中
                if (!region.clue_nums.includes(num)) continue;
                // 已填入num的数量
                let filledCount = 0;
                for (const [r, c] of region.cells) {
                    if (board[r][c] === num) filledCount++;
                }
                // 提示数中num的数量
                const clueCount = region.clue_nums.filter(n => n === num).length;
                // 填入后不能超过提示数数量
                if (filledCount + 1 > clueCount) continue;
            }
        } else {
            // 跳过已存在的数字
            if (existing_nums.has(num)) continue;
        }
        let positions = [];
        for (const [r, c] of region_cells) {
            if (board[r][c] === -1) continue;
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                positions.push([r, c]);
            }
        }
        if (existing_nums.size >= size - nat && positions.length === 1) {
            const [row, col] = positions[0];
            // 新增：填入前先判断是否合法
            if (!isValid(board, size, row, col, num)) {
                has_conflict = true;
                if (!state.silentMode) log_process(`[冲突] ${region_type}${region_index ? region_index : ''}中${getRowLetter(row+1)}${col+1}填${num}不合法，无解`);
                return true;
            }

            let score_sum = 0;
            if (!state.silentMode) {
                // 计算分值：该区域所有未定格子对该数的candidate_elimination_score倒数和
                
                for (const [r, c] of region_cells) {
                    if (Array.isArray(board[r][c])) {
                        const key = `${r},${c},${num}`;
                        const score = state.candidate_elimination_score[key] || 0;
                        if (score > 0) {
                            score_sum += 1 / score;
                        }
                    }
                }
                state.total_score_sum += score_sum;
                score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
            }

            board[row][col] = num;
            // 清空该格子的所有候选数分值
            for (let n = 1; n <= size; n++) {
                state.candidate_elimination_score[`${row},${col},${n}`] = 0;
            }
            if (!state.silentMode) log_process(`[${region_type}排除_${nat}] 第${region_index}${region_type} ${getRowLetter(row+1)}${col+1}=${num}，分值=${score_sum}`);
            eliminate_candidates(board, size, row, col, num);
            return;
        } else if (positions.length === 0) {
            // has_conflict = true;
            // if (!state.silentMode) log_process(`[冲突] ${region_type}${region_index ? region_index : ''}中数字${num}无可填入位置，无解`);
            // return true;
        }
    }
    return has_conflict;
}

// 宫排除法
function check_Box_Elimination(board, size, nat = 1) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

        // 如果是缺一门数独模式，执行特殊排除逻辑
    if (state.current_mode === 'missing') {
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];
                const num_positions = {};
                const missing_nums = [];
                const existing_nums = new Set();

                // 先收集宫中已存在的数字
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
                            existing_nums.add(board[r][c]);
                        }
                    }
                }

                // 统计数字在宫中的候选格位置（跳过黑格和已存在的数字）
                for (let num = 1; num <= size; num++) {
                    if (existing_nums.has(num)) continue; // 跳过已存在的数字
                    num_positions[num] = [];
                    for (let r = start_row; r < start_row + box_size[0]; r++) {
                        for (let c = start_col; c < start_col + box_size[1]; c++) {
                            if (board[r][c] === -1) continue; // 跳过黑格
                            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                                num_positions[num].push([r, c]);
                            }
                        }
                    }
                    // 记录没有可填位置的数字
                    if (num_positions[num].length === 0) {
                        missing_nums.push(num);
                    }
                }

                // 检查是否有欠一数对组标记
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                const subsetInfo = state.box_missing_subsets[`box_${box_num}`];

                // 如果满足条件（有缺失数字）
                if (missing_nums.length === 1 || subsetInfo) {
                    // 对其他数字执行宫排除
                    for (let num = 1; num <= size; num++) {
                        if (missing_nums.includes(num)) continue;
                        // 如果有欠一数对组标记，跳过标记中的数字
                        if (subsetInfo && subsetInfo.nums.includes(num)) continue;
                        if (!num_positions[num]) continue;
                        if (num_positions[num].length === 1) {
                            const [row, col] = num_positions[num][0];
                            board[row][col] = num;
                            if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                            eliminate_candidates(board, size, row, col, num);
                            return;
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        // 普通模式下，直接用统一区域生成
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '宫') {
                if (region_elimination(board, size, region.cells, region.type, region.index, nat)) return true;
            }
        }
    }
    return false;
}

// 行列排除法
function check_Row_Col_Elimination(board, size, nat = 1) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;
        // 如果是缺一门数独模式，执行特殊排除逻辑
    if (state.current_mode === 'missing') {
        // 行排除逻辑
        for (let row = 0; row < size; row++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集行中已存在的数字
            for (let col = 0; col < size; col++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在行中的候选格位置
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let col = 0; col < size; col++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(col);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查欠一数对组标记
            const subset_info = state.row_missing_subsets[`row_${row}`];

            // 4. 执行行排除
            if (missing_nums.length === 1 || subset_info) {
                for (let num = 1; num <= size; num++) {
                    if (missing_nums.includes(num)) continue;
                    if (subset_info && subset_info.nums.includes(num)) continue;
                    if (!num_positions[num]) continue;
                    
                    if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
                        const col = num_positions[num][0];
                        const cell = board[row][col];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            board[row][col] = num;
                            if (!state.silentMode) log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                            eliminate_candidates(board, size, row, col, num);
                            return;
                        }
                    } else if (num_positions[num].length === 0) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
                        return true;
                    }
                }
            }
        }

        // 列排除逻辑
        for (let col = 0; col < size; col++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集列中已存在的数字
            for (let row = 0; row < size; row++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在列中的候选格位置
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let row = 0; row < size; row++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(row);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查欠一数对组标记
            const subset_info = state.col_missing_subsets[`col_${col}`];

            // 4. 执行列排除
            if (missing_nums.length === 1 || subset_info) {
                for (let num = 1; num <= size; num++) {
                    if (missing_nums.includes(num)) continue;
                    if (subset_info && subset_info.nums.includes(num)) continue;
                    if (!num_positions[num]) continue;
                    
                    if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
                        const row = num_positions[num][0];
                        const cell = board[row][col];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            board[row][col] = num;
                            if (!state.silentMode) log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                            eliminate_candidates(board, size, row, col, num);
                            return;
                        }
                    } else if (num_positions[num].length === 0) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
                        return true;
                    }
                }
            }
        }
        return has_conflict;
    } else {
        // 普通模式下，直接用统一区域生成
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '行' || region.type === '列') {
                if (region_elimination(board, size, region.cells, region.type, region.index, nat)) return true;
            }
        }
    }
    return false;
}

// 额外区域排除法
function check_Extra_Region_Elimination(board, size, nat = 1) {
    // 用统一区域生成方式处理对角线
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            // // 新增：只有当该变型区域的格子数恰好等于 size 时才进行变型区域排除
            // if (!Array.isArray(region.cells) || region.cells.length !== size) continue;
            // 统计该区域所有格子中“可能出现”的数字并集（包括已定数字与候选数），跳过黑格
            const unionSet = new Set();
            for (const [r, c] of region.cells) {
                const cell = board[r][c];
                if (cell === -1) continue; // 黑格
                if (typeof cell === 'number') {
                    if (cell !== -1) unionSet.add(cell);
                } else if (Array.isArray(cell)) {
                    for (const n of cell) unionSet.add(n);
                }
            }

            // 只有当并集大小等于 size 时，说明该变型区域覆盖了所有数字范围，才进行变型区域排除
            // log_process(`[额外区域排除] 检查${region.type}${region.index}，数字并集大小=${unionSet.size}`);
            if (unionSet.size !== region.cells.length) continue;
            if (region_elimination(board, size, region.cells, region.type, region.index, nat)) return true;
        }
    }
    return false;
}

// 一刀流宫排除
function check_Box_Elimination_One_Cut(board, size) {
    // 宫的大小定义（兼容6宫格）
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 先遍历每个数字
    for (let num = 1; num <= size; num++) {
        // 统计整个数独中数字num出现的次数（放在宫循环外面）
        let num_count_total = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === num) num_count_total++;
            }
        }
        // 再遍历每个宫
        let box_index = 0;
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                // 统计每个数字在该宫出现的候选格位置
                const num_positions = {};

                // 计算宫的起始行列
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];

                // 先检查宫中是否已有确定数字
                const existing_nums = new Set();
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        if (typeof board[r][c] === 'number') {
                            existing_nums.add(board[r][c]);
                        }
                    }
                }

                // 如果整个数独中num已填满，则跳过
                if (num_count_total === size) {
                    continue;
                }

                num_positions[num] = [];
                // 如果数字已存在，跳过统计
                if (existing_nums.has(num)) {
                    continue;
                }

                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        const cell = board[r][c];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            num_positions[num].push([r, c]);
                        }
                    }
                }

                if (num_positions[num].length === 1) {
                    const [row, col] = num_positions[num][0];
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        board[row][col] = num;
                        if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                        eliminate_candidates(board, size, row, col, num);
                        return;
                    }
                } else if (num_positions[num].length === 0) {
                    has_conflict = true; // 直接标记冲突
                    const box_num = box_row * (size / box_size[1]) + box_col + 1;
                    if (!state.silentMode) log_process(`[冲突] ${box_num}宫中数字${num}无可填入位置，无解`);
                    return true;
                }

                
                // 注意：只有num_count === size时才continue，否则停留在当前num
            }
        }
        if (num_count_total != size) {
            return;
        }
    }
}

// 欠一宫排除（专用于缺一门数独）
function check_Box_Missing_One_Subset_Elimination(board, size, nat = 2) {
    // log_process(`[欠一宫排除] 检查欠一宫，nat=${nat}`);
    // 仅缺一门数独模式有效
    if (state.current_mode !== 'missing') return false;
    
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            const numPositions = {};
            const existingNums = new Set();

            // 1. 先收集宫中已存在的数字
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
                        existingNums.add(board[r][c]);
                    }
                }
            }

            // 2. 统计数字在宫中的候选格位置（跳过黑格和已存在的数字）
            for (let num = 1; num <= size; num++) {
                if (existingNums.has(num)) continue;
                numPositions[num] = [];
                for (let r = startRow; r < startRow + boxSize[0]; r++) {
                    for (let c = startCol; c < startCol + boxSize[1]; c++) {
                        if (board[r][c] === -1) continue; // 跳过黑格
                        if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                            numPositions[num].push([r, c]);
                        }
                    }
                }
            }

            // 3. 通用逻辑：检测 (nat) 个数字只能填在 (nat-1) 个格子的情况
            if (nat >= 2 && nat <= 4) {
                // 生成所有可能的数字组合（大小为 nat）
                const allNums = Array.from({length: size}, (_, i) => i + 1)
                    .filter(num => !existingNums.has(num));
                const numCombinations = getCombinations(allNums, nat);

                for (const nums of numCombinations) {
                    // 统计这些数字出现的格子
                    const positions = new Set();
                    for (const num of nums) {
                        if (numPositions[num]) {
                            for (const [r, c] of numPositions[num]) {
                                positions.add(`${r},${c}`);
                            }
                        }
                    }

                    // 检查是否满足条件：数字只能填在 (nat-1) 个格子中
                    if (positions.size === nat - 1) {
                        const posArray = Array.from(positions).map(pos => {
                            const [r, c] = pos.split(',').map(Number);
                            return { r, c };
                        });

                        // 检查这些格子是否都包含至少两个目标数字
                        let isValid = true;
                        for (const { r, c } of posArray) {
                            const cell = board[r][c];
                            const count = nums.filter(n => cell.includes(n)).length;
                            if (count < 2) {
                                isValid = false;
                                break;
                            }
                        }

                        if (isValid) {
                            let modified = false;
                            // 从这些格子中删除其他数字
                            for (const { r, c } of posArray) {
                                const originalLength = board[r][c].length;
                                board[r][c] = board[r][c].filter(n => nums.includes(n));
                                if (board[r][c].length < originalLength) {
                                    modified = true;
                                }
                            }

                            if (modified) {
                                const cells = posArray.map(({r, c}) => `${getRowLetter(r+1)}${c+1}`).join('、');
                                const subsetName = nat === 2 ? '数对' : nat === 3 ? '三数组' : '四数组';
                                if (!state.silentMode) {
                                    log_process(`[欠一排除] ${cells}构成隐性${subsetName}${nums.join('')}，删除其他候选数`);
                                }

                                // 记录欠一数对组信息
                                const boxNum = boxRow * (size / boxSize[1]) + boxCol + 1;
                                state.box_missing_subsets[`box_${boxNum}`] = {
                                    nums: nums,
                                    positions: posArray.map(({r, c}) => `${r},${c}`)
                                };
                                return; // 每次只处理一个发现
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 欠一行列排除（合并函数，专用于缺一门数独）
function check_Row_Col_Missing_One_Subset_Elimination(board, size, subset_size = 2) {
    // 仅缺一门数独模式有效
    if (state.current_mode !== 'missing') return false;
    
    let has_conflict = false;
    
    // 行排除逻辑
    for (let row = 0; row < size; row++) {
        const num_positions = {};
        const missing_nums = [];
        const existing_nums = new Set();

        // 1. 收集行中已存在的数字
        for (let col = 0; col < size; col++) {
            if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                existing_nums.add(board[row][col]);
            }
        }

        // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
        for (let num = 1; num <= size; num++) {
            if (existing_nums.has(num)) continue;
            num_positions[num] = [];
            
            for (let col = 0; col < size; col++) {
                if (board[row][col] === -1) continue;
                if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                    num_positions[num].push(col);
                }
            }
            
            // 记录没有可填位置的数字
            if (num_positions[num].length === 0) {
                missing_nums.push(num);
            }
        }

        // 3. 检查是否有欠一数对组标记
        const subset_info = state.row_missing_subsets[`row_${row}`];

        // 4. 检测欠一数组
        if (subset_size >= 2 && subset_size <= 4) {
            const all_nums = Array.from({length: size}, (_, i) => i + 1)
                .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
            const num_combinations = getCombinations(all_nums, subset_size);

            for (const num_group of num_combinations) {
                // 跳过已标记的数字组合
                if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

                // 统计这些数字出现的格子
                const positions = new Set();
                for (const num of num_group) {
                    if (num_positions[num]) {
                        for (const col of num_positions[num]) {
                            positions.add(col);
                        }
                    }
                }

                // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
                if (positions.size === subset_size - 1) {
                    const pos_array = Array.from(positions);
                    
                    // 检查这些格子是否都包含至少两个目标数字
                    let is_valid = true;
                    for (const col of pos_array) {
                        const cell = board[row][col];
                        const count = num_group.filter(n => cell.includes(n)).length;
                        if (count < 2) {
                            is_valid = false;
                            break;
                        }
                    }

                    if (is_valid) {
                        let modified = false;
                        // 从这些格子中删除其他数字
                        for (const col of pos_array) {
                            const original_length = board[row][col].length;
                            board[row][col] = board[row][col].filter(n => num_group.includes(n));
                            if (board[row][col].length < original_length) {
                                modified = true;
                            }
                        }

                        if (modified) {
                            const subset_name = subset_size === 2 ? '数对' : 
                                              subset_size === 3 ? '三数组' : '四数组';
                            const cells = pos_array.map(col => 
                                `${getRowLetter(row+1)}${col+1}`).join('、');
                            if (!state.silentMode) {
                                log_process(`[欠一行排除] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                            }

                            // 记录欠一数对组信息
                            state.row_missing_subsets[`row_${row}`] = {
                                nums: num_group,
                                positions: pos_array.map(col => `${row},${col}`)
                            };
                            return; // 每次只处理一个发现
                        }
                    }
                }
            }
        }
    }

    // 列排除逻辑
    for (let col = 0; col < size; col++) {
        const num_positions = {};
        const missing_nums = [];
        const existing_nums = new Set();

        // 1. 收集列中已存在的数字
        for (let row = 0; row < size; row++) {
            if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                existing_nums.add(board[row][col]);
            }
        }

        // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
        for (let num = 1; num <= size; num++) {
            if (existing_nums.has(num)) continue;
            num_positions[num] = [];
            
            for (let row = 0; row < size; row++) {
                if (board[row][col] === -1) continue;
                if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                    num_positions[num].push(row);
                }
            }
            
            // 记录没有可填位置的数字
            if (num_positions[num].length === 0) {
                missing_nums.push(num);
            }
        }

        // 3. 检查是否有欠一数对组标记
        const subset_info = state.col_missing_subsets[`col_${col}`];

        // 4. 检测欠一数组
        if (subset_size >= 2 && subset_size <= 4) {
            const all_nums = Array.from({length: size}, (_, i) => i + 1)
                .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
            const num_combinations = getCombinations(all_nums, subset_size);

            for (const num_group of num_combinations) {
                // 跳过已标记的数字组合
                if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

                // 统计这些数字出现的格子
                const positions = new Set();
                for (const num of num_group) {
                    if (num_positions[num]) {
                        for (const row of num_positions[num]) {
                            positions.add(row);
                        }
                    }
                }

                // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
                if (positions.size === subset_size - 1) {
                    const pos_array = Array.from(positions);
                    
                    // 检查这些格子是否都包含至少两个目标数字
                    let is_valid = true;
                    for (const row of pos_array) {
                        const cell = board[row][col];
                        const count = num_group.filter(n => cell.includes(n)).length;
                        if (count < 2) {
                            is_valid = false;
                            break;
                        }
                    }

                    if (is_valid) {
                        let modified = false;
                        // 从这些格子中删除其他数字
                        for (const row of pos_array) {
                            const original_length = board[row][col].length;
                            board[row][col] = board[row][col].filter(n => num_group.includes(n));
                            if (board[row][col].length < original_length) {
                                modified = true;
                            }
                        }

                        if (modified) {
                            const subset_name = subset_size === 2 ? '数对' : 
                                              subset_size === 3 ? '三数组' : '四数组';
                            const cells = pos_array.map(row => 
                                `${getRowLetter(row+1)}${col+1}`).join('、');
                            if (!state.silentMode) {
                                log_process(`[欠一列排除] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                            }

                            // 记录欠一数对组信息
                            state.col_missing_subsets[`col_${col}`] = {
                                nums: num_group,
                                positions: pos_array.map(row => `${row},${col}`)
                            };
                            return; // 每次只处理一个发现
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}

// 唯余法
function check_cell_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

    // 构建所有区域（宫、行、列）
    // const regions = [];
    const regions = get_all_regions(size, state.current_mode);

    // 遍历所有格子
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                // 冲突检测
                if (cell.length === 0) {
                    has_conflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row + 1)}${col + 1}无候选数，无解`);
                    return true;
                }
                // 唯一候选数
                if (cell.length === 1) {
                    const num = cell[0];
                    // 新增：填入前先判断是否合法
                    if (!isValid(board, size, row, col, num)) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row + 1)}${col + 1}填${num}不合法，无解`);
                        return true;
                    }
                    // 检查所有区域
                    for (const region of regions) {
                        // 该格是否属于该区域
                        if (!region.cells.some(([r, c]) => r === row && c === col)) continue;
                        // 区域内已填数字
                        const region_nums = new Set();
                        for (const [r, c] of region.cells) {
                            if (typeof board[r][c] === 'number') {
                                region_nums.add(board[r][c]);
                            }
                        }
                        if (region_nums.size === size - nat && !region_nums.has(num)) {
                            let score_sum = 0;
                            if (!state.silentMode) {    
                                // 计算分值：该格子中除num以外的其他候选数的candidate_elimination_score倒数和
                                
                                for (let other = 1; other <= size; other++) {
                                    if (other !== num) {
                                        const key = `${row},${col},${other}`;
                                        const score = state.candidate_elimination_score[key] || 0;
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                        if (score > 0) {
                                            score_sum += 1 / score;
                                            // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${other} -> 分值=${score}`);
                                        }
                                    }
                                }
                                for (let i = 1; i <= nat; i++) {
                                    if (i <= 5) {
                                        score_sum = score_sum * i; // 乘以nat的阶乘
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    } else if (i > 5) {
                                        score_sum = score_sum * (10 - i);
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    } else {
                                        score_sum = score_sum * 1;
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    }
                                }
                                score_sum = score_sum / 12; // 4的阶乘
                                state.total_score_sum += score_sum;
                                score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
                            }

                            board[row][col] = num;
                            // 清空该格子的所有候选数分值
                            for (let n = 1; n <= size; n++) {
                                state.candidate_elimination_score[`${row},${col},${n}`] = 0;
                            }
                            let region_name = region.type;
                            let region_index = region.index;
                            if (!state.silentMode) log_process(`[唯余法_${nat}] 第${region_index}${region_name} ${getRowLetter(row + 1)}${col + 1}=${num}，分值=${score_sum}`);
                            eliminate_candidates(board, size, row, col, num);
                            return;
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}

/**
 * 特定组合候选数排除（只删候选，不模拟填入和全局冲突）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域四个格子的坐标
 * @param {Array<number>} clue_nums - 区域的四个数字
 * @param {string} region_type - 区域类型（如 '特定组合'）
 * @param {number} region_index - 区域编号
 * @returns {boolean} 是否有变化
 */
// 变型特定组合排除
function special_combination_region_elimination(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;
    
    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    // 2. 记录各格子在合法分配下可以出现的数字
    const valid_nums_for_cell = region_cells.map(() => new Set());
    let foundCombo = false;

    if (unknown_indices.length > 0) {
        // 创建副本用于回溯
        const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
        const path = new Array(unknown_indices.length);
        
        function find_all_solutions(depth) {
            if (depth === unknown_indices.length) {
                foundCombo = true;
                for (let i = 0; i < unknown_indices.length; i++) {
                    valid_nums_for_cell[unknown_indices[i]].add(path[i]);
                }
                return;
            }

            const idx = unknown_indices[depth];
            const [r, c] = region_cells[idx];
            const candidates = board[r][c];

            for (const num of candidates) {
                const prev = board_clone[r][c];
                board_clone[r][c] = num;

                if (isValid(board_clone, size, r, c, num)) {
                    path[depth] = num;
                    find_all_solutions(depth + 1);
                }

                board_clone[r][c] = prev;
            }
        }
        
        find_all_solutions(0);

        if (!foundCombo) {
             // 无解，清空所有候选数
             for (const idx of unknown_indices) {
                const [r, c] = region_cells[idx];
                if (board[r][c].length > 0) {
                    board[r][c] = [];
                    changed = true;
                }
            }
            return changed;
        }
    }

    // 3. 过滤候选数
    for (let idx of unknown_indices) {
        const [r, c] = region_cells[idx];
        const valid_nums = valid_nums_for_cell[idx];
        const before_len = board[r][c].length;
        
        const new_candidates = board[r][c].filter(n => valid_nums.has(n));
        
        if (new_candidates.length < before_len) {
            const deleted = board[r][c].filter(n => !valid_nums.has(n));
            board[r][c] = new_candidates;
            changed = true;
            if (!state.silentMode) {
                log_process(`[${region_type}排除_${nat}] ${region_index}${region_type}的${getRowLetter(r+1)}${c+1}删去${deleted.join('、')}`);
            }
        }
        
        // 修复：填数逻辑移出到这里。只要剩下一个候选数，就将其转为确定数字
        if (Array.isArray(board[r][c]) && board[r][c].length === 1) {
            const num = board[r][c][0];
            board[r][c] = num;
            eliminate_candidates(board, size, r, c, num);
            changed = true;
            if (!state.silentMode) {
                log_process(`[${region_type}排除_${nat}] ${region_index}${region_type}的${getRowLetter(r+1)}${c+1}唯一可填${num}，直接确定`);
            }
        }
    }
    return changed;
}

function check_special_combination_region_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(size, state.current_mode);

    for (const region of regions) {
        if (region.type === '特定组合' || region.type === '合并特定组合') {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            // log_process(`[特定组合排除] 检查第${region.index}特定组合，数字${region.clue_nums.join('、')}，未定格子数=${uncertain_cells.length}`);
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // 调用特定组合排除函数
            if (special_combination_region_elimination(board, size, region.cells, region.type, region.index, nat)) return; // 如果有变化，直接返回
        }
    }
    return has_conflict;
}

/**
 * 多特定组合联合排除
 * 1. 获取所有特定组合
 * 2. 标记每个区域的格子属于哪些宫/行/列
 * 3. 找出有共同宫/行/列的两个区域，合并格子和数字，作为一个新的特定组合进行检测
 */
function check_multi_special_combination_region_elimination(board, size, nat = 1) {
    // 1. 获取所有特定组合
    const regions = get_special_combination_regions(size, state.current_mode);
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;

            if (intersection.length > 0) {
                // 5. 合并格子和数字，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];
                // const merged_nums = [
                //     ...regions[i].clue_nums,
                //     ...regions[j].clue_nums
                // ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用已有的排除函数
                const changed = special_combination_region_elimination(
                    board,
                    size,
                    merged_cells,
                    // merged_nums,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return; // 只要有变化就返回
            }
        }
    }
    return false;
}

/**
 * 通用区域区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {string} region_type - 区域类型（如 '宫', '行', '列'）
 * @param {number} region_index - 区域编号（如第几宫/行/列，1开始）
 * @returns {boolean} 是否有变化
 */
function region_block_elimination(board, size, region_cells, region_type, region_index, classic, nat = 2) {
    let changed = false;
    for (let num = 1; num <= size; num++) {
        // 收集该区域内num的所有候选格
        const candidate_positions = [];
        for (const [r, c] of region_cells) {
            const cell = board[r][c];
            if (Array.isArray(cell) && cell.includes(num)) {
                candidate_positions.push([r, c]);
            }
        }
        if (candidate_positions.length < 2) continue;

        // 如果指定了 target_nat，只处理符合条件的区块
        if (nat !== null && candidate_positions.length !== nat) continue;

        // 对每个候选格，模拟eliminate_candidates，收集所有能删到的位置
        const elimination_sets = [];
        for (const [r, c] of candidate_positions) {
            // // 备份分值状态
            // const backup_score = JSON.parse(JSON.stringify(state.candidate_elimination_score));
            // const backup_total = state.total_score_sum;

            // 复制board，模拟填入num
            const board_copy = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
            board_copy[r][c] = num;
            // const eliminations = eliminate_candidates(board_copy, size, r, c, num, false);
            // 根据classic参数选择调用的函数
            const eliminations = classic 
                ? eliminate_candidates_classic(board_copy, size, r, c, num, false)
                : eliminate_candidates(board_copy, size, r, c, num, false);
            const eliminated_positions = eliminations
                // .filter(e => e.eliminated.includes(num))
                .filter(e => Array.isArray(e.eliminated) && e.eliminated.includes(num))
                .map(e => `${e.row},${e.col}`);
            elimination_sets.push(new Set(eliminated_positions));

            // // 恢复分值状态
            // state.candidate_elimination_score = JSON.parse(JSON.stringify(backup_score));
            // state.total_score_sum = backup_total;
        }

        // 求交集
        let intersection = elimination_sets[0];
        for (let i = 1; i < elimination_sets.length; i++) {
            intersection = new Set([...intersection].filter(x => elimination_sets[i].has(x)));
        }
        // 排除本身候选格
        for (const [r, c] of candidate_positions) {
            intersection.delete(`${r},${c}`);
        }
        if (intersection.size === 0) continue;

        let score_sum = 1;
        if (!state.silentMode) {
            // 计算本区域该数所有候选格的分值总和
            
            for (const [r, c] of region_cells) {
                const key = `${r},${c},${num}`;
                const score = state.candidate_elimination_score[key] || 0;
                if (score > 0) {
                    score_sum += 1 / score;
                    // log_process(`候选数分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${score_sum}`);
                }
            }
            score_sum = score_sum * candidate_positions.length;
            score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
            // score_sum += (size - candidate_positions.length) * candidate_positions.length;
            // score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
        }

        // 真正执行删除
        for (const pos of intersection) {
            const [r, c] = pos.split(',').map(Number);
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                board[r][c] = board[r][c].filter(n => n !== num);
                changed = true;

                if (!state.silentMode) {    
                    // 分值累加到该候选数
                    const key = `${r},${c},${num}`;
                    if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                    state.candidate_elimination_score[key] += 1 / score_sum;
                    // log_process(`候选数分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${1 / state.candidate_elimination_score[key]}`);
                }
            }
        }
        if (changed) {
            const block_cells = candidate_positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
            const eliminated_cells = [...intersection].map(pos => {
                const [r, c] = pos.split(',').map(Number);
                return `${getRowLetter(r+1)}${c+1}`;
            }).join('、');
            const prefix = classic ? '' : '变型';
            // const nat = candidate_positions.length; // 组成区块的数字占用的格子数
            if (!state.silentMode) log_process(`[${prefix}${region_type}区块_${nat}] 第${region_index}${region_type}  ${block_cells}构成${num}区块，删除${eliminated_cells}的${num}，分值=${score_sum}`);
            return true;
        }
    }
    return false;
}

// 宫区块排除
function check_box_block_elimination(board, size, nat = 2, classic = true) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 如果是缺一门数独模式，执行特殊排除逻辑
    if (state.current_mode === 'missing') {
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];
                const num_positions = {};
                const missing_nums = [];
                const existing_nums = new Set();

                // 先收集宫中已存在的数字
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
                            existing_nums.add(board[r][c]);
                        }
                    }
                }

                // 统计数字在宫中的候选格位置（跳过黑格和已存在的数字）
                for (let num = 1; num <= size; num++) {
                    if (existing_nums.has(num)) continue; // 跳过已存在的数字
                    num_positions[num] = [];
                    for (let r = start_row; r < start_row + box_size[0]; r++) {
                        for (let c = start_col; c < start_col + box_size[1]; c++) {
                            if (board[r][c] === -1) continue; // 跳过黑格
                            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                                num_positions[num].push([r, c]);
                            }
                        }
                    }
                    // 记录没有可填位置的数字
                    if (num_positions[num].length === 0) {
                        missing_nums.push(num);
                    }
                }

                // 检查是否有欠一数对组标记
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                const subset_info = state.box_missing_subsets[`box_${box_num}`];

                // 如果满足条件（有缺失数字）
                if (missing_nums.length === 1 || subset_info) {
                    // 对其他数字执行宫区块排除
                    for (let num = 1; num <= size; num++) {
                        if (missing_nums.includes(num)) continue;
                        // 如果有欠一数对组标记，跳过标记中的数字
                        if (subset_info && subset_info.nums.includes(num)) continue;
                        if (!num_positions[num]) continue;
                        
                        // 区块排除法逻辑
                        if (num_positions[num].length > 1) {
                            // 检查是否全部在同一行
                            const all_same_row = num_positions[num].every(([r, _]) => r === num_positions[num][0][0]);
                            // 检查是否全部在同一列
                            const all_same_col = num_positions[num].every(([_, c]) => c === num_positions[num][0][1]);

                            if (all_same_row) {
                                const target_row = num_positions[num][0][0];
                                let excluded_cells = [];
                                
                                // 删除该行其他宫中该数字的候选
                                for (let col = 0; col < size; col++) {
                                    if (col < start_col || col >= start_col + box_size[1]) {
                                        const cell = board[target_row][col];
                                        if (Array.isArray(cell) && cell.includes(num)) {
                                            board[target_row][col] = cell.filter(n => n !== num);
                                            excluded_cells.push(`${getRowLetter(target_row+1)}${col+1}`);
                                        }
                                    }
                                }

                                if (excluded_cells.length > 0) {
                                    const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                    if (!state.silentMode) log_process(`[宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                    return;
                                }
                            }

                            if (all_same_col) {
                                const target_col = num_positions[num][0][1];
                                let excluded_cells = [];
                                // 删除该列其他宫中该数字的候选
                                for (let row = 0; row < size; row++) {
                                    if (row < start_row || row >= start_row + box_size[0]) {
                                        const cell = board[row][target_col];
                                        if (Array.isArray(cell) && cell.includes(num)) {
                                            board[row][target_col] = cell.filter(n => n !== num);
                                            excluded_cells.push(`${getRowLetter(row+1)}${target_col+1}`);
                                        }
                                    }
                                }
                                if (excluded_cells.length > 0) {
                                    const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                    if (!state.silentMode) log_process(`[宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '宫') {
                if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
            }
        }
    }
    return has_conflict;
}

// 一刀流宫区块排除
function check_box_block_elimination_One_Cut(board, size) {
    // log_process(`[一刀流宫区块排除] 开始检查`);
    // 宫的大小定义（兼容6宫格）
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 遍历每个数字
    for (let num = 1; num <= size; num++) {
        // 统计整个数独中数字num出现的次数
        let num_count_total = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === num) num_count_total++;
            }
        }
        // 如果已填满则跳过
        if (num_count_total === size) continue;

        // 遍历每个宫
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];
                const num_positions = [];

                // 统计该宫内num的所有候选格
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        const cell = board[r][c];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            num_positions.push([r, c]);
                        }
                    }
                }

                // 区块排除逻辑
                if (num_positions.length > 1) {
                    // 检查是否全部在同一行
                    const all_same_row = num_positions.every(([r, _]) => r === num_positions[0][0]);
                    // 检查是否全部在同一列
                    const all_same_col = num_positions.every(([_, c]) => c === num_positions[0][1]);

                    if (all_same_row) {
                        const target_row = num_positions[0][0];
                        let excluded_cells = [];
                        for (let col = 0; col < size; col++) {
                            if (col < start_col || col >= start_col + box_size[1]) {
                                const cell = board[target_row][col];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[target_row][col] = cell.filter(n => n !== num);
                                    excluded_cells.push(`${getRowLetter(target_row+1)}${col+1}`);
                                }
                            }
                        }
                        if (excluded_cells.length > 0) {
                            const block_cells = num_positions.map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                            if (!state.silentMode) log_process(`[一刀流宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                            return;
                        }
                    }

                    if (all_same_col) {
                        const target_col = num_positions[0][1];
                        let excluded_cells = [];
                        for (let row = 0; row < size; row++) {
                            if (row < start_row || row >= start_row + box_size[0]) {
                                const cell = board[row][target_col];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[row][target_col] = cell.filter(n => n !== num);
                                    excluded_cells.push(`${getRowLetter(row+1)}${target_col+1}`);
                                }
                            }
                        }
                        if (excluded_cells.length > 0) {
                            const block_cells = num_positions.map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                            if (!state.silentMode) log_process(`[一刀流宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                            return;
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}

// 行列区块排除
function check_Row_Col_Block_Elimination(board, size, nat = 2, classic = true) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 缺一门模式下特殊逻辑
    if (state.current_mode === 'missing') {
        // 行区块逻辑
        for (let row = 0; row < size; row++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集行中已存在的数字
            for (let col = 0; col < size; col++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let col = 0; col < size; col++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(col);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查是否有欠一数对组标记
            const subset_info = state.row_missing_subsets[`row_${row}`];

            // 4. 如果满足条件（有缺失数字或已有数对组标记）
            if (missing_nums.length === 1 || subset_info) {
                // 对其他数字执行行区块排除
                for (let num = 1; num <= size; num++) {
                    if (missing_nums.includes(num)) continue;
                    if (subset_info && subset_info.nums.includes(num)) continue;
                    if (!num_positions[num]) continue;
                    
                    // 行区块排除逻辑
                    if (num_positions[num].length > 1) {
                        // 检查这些候选格是否都在同一个宫内
                        const first_box_col = Math.floor(num_positions[num][0] / box_size[1]);
                        const all_same_box = num_positions[num].every(col => 
                            Math.floor(col / box_size[1]) === first_box_col
                        );

                        if (all_same_box) {
                            const box_col = first_box_col;
                            const start_col = box_col * box_size[1];
                            const box_row = Math.floor(row / box_size[0]);
                            const start_row = box_row * box_size[0];
                            let excluded_cells = [];

                            // 从该宫的其他行中排除该数字
                            for (let r = start_row; r < start_row + box_size[0]; r++) {
                                if (r === row) continue;
                                for (let c = start_col; c < start_col + box_size[1]; c++) {
                                    const cell = board[r][c];
                                    if (Array.isArray(cell) && cell.includes(num)) {
                                        board[r][c] = cell.filter(n => n !== num);
                                        excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                    }
                                }
                            }

                            if (excluded_cells.length > 0) {
                                const block_cells = num_positions[num].map(col => 
                                    `${getRowLetter(row+1)}${col+1}`).join('、');
                                if (!state.silentMode) {
                                    log_process(`[行区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                }
                                return;
                            }
                        }
                    }
                }
            }
        }

        // 列区块逻辑
        for (let col = 0; col < size; col++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集列中已存在的数字
            for (let row = 0; row < size; row++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let row = 0; row < size; row++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(row);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查是否有欠一数对组标记
            const subset_info = state.col_missing_subsets[`col_${col}`];

            // 4. 如果满足条件（有缺失数字或已有数对组标记）
            if (missing_nums.length === 1 || subset_info) {
                // 对其他数字执行列区块排除
                for (let num = 1; num <= size; num++) {
                    if (missing_nums.includes(num)) continue;
                    if (subset_info && subset_info.nums.includes(num)) continue;
                    if (!num_positions[num]) continue;
                    
                    // 列区块排除逻辑
                    if (num_positions[num].length > 1) {
                        // 检查这些候选格是否都在同一个宫内
                        const first_box_row = Math.floor(num_positions[num][0] / box_size[0]);
                        const all_same_box = num_positions[num].every(row =>
                            Math.floor(row / box_size[0]) === first_box_row
                        );
                        
                        if (all_same_box) {
                            const box_row = first_box_row;
                            const start_row = box_row * box_size[0];
                            const box_col = Math.floor(col / box_size[1]);
                            const start_col = box_col * box_size[1];
                            let excluded_cells = [];
                            
                            // 从该宫的其他列中排除该数字
                            for (let c = start_col; c < start_col + box_size[1]; c++) {
                                if (c === col) continue;
                                for (let r = start_row; r < start_row + box_size[0]; r++) {
                                    const cell = board[r][c];
                                    if (Array.isArray(cell) && cell.includes(num)) {
                                        board[r][c] = cell.filter(n => n !== num);
                                        excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                    }
                                }
                            }
                            
                            if (excluded_cells.length > 0) {
                                const block_cells = num_positions[num].map(row => 
                                    `${getRowLetter(row+1)}${col+1}`).join('、');
                                if (!state.silentMode) {
                                    log_process(`[列区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                }
                                return;
                            }
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        // 普通模式下，直接用统一区域生成
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '行' || region.type === '列') {
                if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
            }
        }
    }
    return has_conflict;
}

// 额外区域区块排除（主对角线、副对角线，统一用region_block_elimination处理）
function check_Extra_Region_Block_Elimination(board, size, nat = 2, classic = true) {
    // 用统一区域生成方式处理额外区域区块
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            // 统计该区域所有格子中“可能出现”的数字并集（包括已定数字与候选数），跳过黑格
            const unionSet = new Set();
            for (const [r, c] of region.cells) {
                const cell = board[r][c];
                if (cell === -1) continue; // 黑格
                if (typeof cell === 'number') {
                    if (cell !== -1) unionSet.add(cell);
                } else if (Array.isArray(cell)) {
                    for (const n of cell) unionSet.add(n);
                }
            }

            // 只有当并集大小等于 size 时，说明该变型区域覆盖了所有数字范围，才进行变型区域排除
            // log_process(`[额外区域排除] 检查${region.type}${region.index}，数字并集大小=${unionSet.size}`);
            if (unionSet.size !== region.cells.length) continue;
            if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
        }
    }
}

/**
 * 特定组合核心删数函数（带日志和区块信息）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域四个格子的坐标
 * @param {Array<number>} clue_nums - 区域的四个数字
 * @param {string} region_type - 区域类型（如 '特定组合'）
 * @param {number} region_index - 区域编号
 * @returns {boolean} 是否有变化
 */
// // 变型特定组合区块排除
// function special_combination_region_block_elimination(board, size, region_cells, clue_nums, region_type, region_index) {
//     let changed = false;

//     const cell_candidates = [];
//     const known_indices = [];
//     const known_nums = [];
//     for (let i = 0; i < region_cells.length; i++) {
//         const [r, c] = region_cells[i];
//         if (typeof board[r][c] === 'number') {
//             known_indices.push(i);
//             known_nums.push(board[r][c]);
//             cell_candidates.push([board[r][c]]);
//         } else if (Array.isArray(board[r][c])) {
//             cell_candidates.push([...board[r][c]]);
//         } else {
//             cell_candidates.push([]);
//         }
//     }

//     let nums_to_fill = clue_nums.slice();
//     for (const n of known_nums) {
//         const idx = nums_to_fill.indexOf(n);
//         if (idx !== -1) nums_to_fill.splice(idx, 1);
//     }

//     const known_index_set = new Set(known_indices);
//     const unknown_indices = [];
//     for (let i = 0; i < region_cells.length; i++) {
//         if (!known_index_set.has(i)) unknown_indices.push(i);
//     }
//     unknown_indices.sort((a, b) => cell_candidates[a].length - cell_candidates[b].length);

//     if (unknown_indices.length === 0) return false;

//     const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
//     const candidate_sets = cell_candidates.map(cands => new Set(cands));
//     for (let i = 0; i < known_indices.length; i++) {
//         const idx = known_indices[i];
//         const [r, c] = region_cells[idx];
//         board_clone[r][c] = known_nums[i];
//     }

//     const used = Array(nums_to_fill.length).fill(false);
//     const path = new Array(unknown_indices.length);
//     const seen = new Set();
//     const elimination_sets = [];

//     function dfs(depth) {
//         if (depth === unknown_indices.length) {
//             const assignment = path.slice();
//             const key = assignment.join(',');
//             if (seen.has(key)) return;
//             seen.add(key);

//             const board_copy = board_clone.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
//             const eliminated_map = new Map();

//             for (let d = 0; d < unknown_indices.length; d++) {
//                 const idx = unknown_indices[d];
//                 const [r, c] = region_cells[idx];
//                 const num = assignment[d];
//                 const eliminations = eliminate_candidates(board_copy, size, r, c, num, false);
//                 for (const elim of eliminations) {
//                     if (!elim.eliminated || elim.eliminated.length === 0) continue;
//                     const posKey = `${elim.row},${elim.col}`;
//                     if (!eliminated_map.has(posKey)) eliminated_map.set(posKey, new Set());
//                     for (const n of elim.eliminated) {
//                         eliminated_map.get(posKey).add(n);
//                     }
//                 }
//             }

//             elimination_sets.push(eliminated_map);
//             return;
//         }

//         const cell_idx = unknown_indices[depth];
//         const candidates = candidate_sets[cell_idx];
//         if (!candidates || candidates.size === 0) return;

//         const [r, c] = region_cells[cell_idx];
//         const tried = new Set();

//         for (let i = 0; i < nums_to_fill.length; i++) {
//             if (used[i]) continue;
//             const num = nums_to_fill[i];
//             if (!candidates.has(num) || tried.has(num)) continue;
//             tried.add(num);

//             const prev = board_clone[r][c];
//             board_clone[r][c] = num;
//             if (!isValid(board_clone, size, r, c, num)) {
//                 board_clone[r][c] = prev;
//                 continue;
//             }

//             used[i] = true;
//             path[depth] = num;
//             dfs(depth + 1);
//             used[i] = false;
//             board_clone[r][c] = prev;
//         }
//     }

//     dfs(0);
//     if (elimination_sets.length === 0) return false;

//     const intersection_map = new Map();
//     const all_keys = new Set();
//     for (const eliminated_map of elimination_sets) {
//         for (const key of eliminated_map.keys()) {
//             all_keys.add(key);
//         }
//     }

//     for (const key of all_keys) {
//         let intersection = null;
//         for (const eliminated_map of elimination_sets) {
//             const nums = eliminated_map.has(key) ? Array.from(eliminated_map.get(key)) : [];
//             if (intersection === null) {
//                 intersection = new Set(nums);
//             } else {
//                 intersection = new Set([...intersection].filter(x => nums.includes(x)));
//             }
//         }
//         if (intersection && intersection.size > 0) {
//             intersection_map.set(key, [...intersection]);
//         }
//     }

//     if (intersection_map.size === 0) return false;

//     const eliminated_cells = [];
//     const eliminated_nums = new Set();
//     for (const [pos, nums] of intersection_map.entries()) {
//         const [r, c] = pos.split(',').map(Number);
//         if (!Array.isArray(board[r][c])) continue;

//         const before_arr = board[r][c];
//         const before = before_arr.length;
//         board[r][c] = board[r][c].filter(n => !nums.includes(n));
//         const actually_deleted = before_arr.filter(n => !board[r][c].includes(n));
//         if (board[r][c].length < before && actually_deleted.length > 0) {
//             changed = true;
//             eliminated_cells.push(`${getRowLetter(r+1)}${c+1}`);
//             actually_deleted.forEach(n => eliminated_nums.add(n));
//         }
//     }

//     if (changed && eliminated_cells.length > 0 && !state.silentMode) {
//         log_process(`[${region_type}区块排除] ${region_index}${region_type}统一删去数字${[...eliminated_nums].join('、')}，位置${eliminated_cells.join('、')}`);
//     }

//     return changed;
// }

// 变型特定组合区块排除
function special_combination_region_block_elimination(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;

    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    if (unknown_indices.length === 0) return false;

    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
    const path = new Array(unknown_indices.length);
    const elimination_sets = [];

    function dfs(depth) {
        if (depth === unknown_indices.length) {
            // 找到一个合法解，计算该解下的排除情况
            const board_copy = board_clone.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
            const eliminated_map = new Map();

            for (let d = 0; d < unknown_indices.length; d++) {
                const idx = unknown_indices[d];
                const [r, c] = region_cells[idx];
                const num = path[d];
                
                // 模拟填入并获取排除结果
                const eliminations = eliminate_candidates(board_copy, size, r, c, num, false);
                for (const elim of eliminations) {
                    if (!elim.eliminated || elim.eliminated.length === 0) continue;
                    const posKey = `${elim.row},${elim.col}`;
                    if (!eliminated_map.has(posKey)) eliminated_map.set(posKey, new Set());
                    for (const n of elim.eliminated) {
                        eliminated_map.get(posKey).add(n);
                    }
                }
            }

            elimination_sets.push(eliminated_map);
            return;
        }

        const idx = unknown_indices[depth];
        const [r, c] = region_cells[idx];
        const candidates = board[r][c];

        for (const num of candidates) {
            const prev = board_clone[r][c];
            board_clone[r][c] = num;

            if (isValid(board_clone, size, r, c, num)) {
                path[depth] = num;
                dfs(depth + 1);
            }

            board_clone[r][c] = prev;
        }
    }

    dfs(0);
    if (elimination_sets.length === 0) return false;

    // 计算所有解的排除交集
    const intersection_map = new Map();
    const all_keys = new Set();
    for (const eliminated_map of elimination_sets) {
        for (const key of eliminated_map.keys()) {
            all_keys.add(key);
        }
    }

    for (const key of all_keys) {
        let intersection = null;
        for (const eliminated_map of elimination_sets) {
            const nums = eliminated_map.has(key) ? Array.from(eliminated_map.get(key)) : [];
            if (intersection === null) {
                intersection = new Set(nums);
            } else {
                intersection = new Set([...intersection].filter(x => nums.includes(x)));
            }
        }
        if (intersection && intersection.size > 0) {
            intersection_map.set(key, [...intersection]);
        }
    }

    if (intersection_map.size === 0) return false;

    // 执行排除
    const eliminated_cells = [];
    const eliminated_nums = new Set();
    for (const [pos, nums] of intersection_map.entries()) {
        const [r, c] = pos.split(',').map(Number);
        if (!Array.isArray(board[r][c])) continue;

        const before_arr = board[r][c];
        const before = before_arr.length;
        board[r][c] = board[r][c].filter(n => !nums.includes(n));
        const actually_deleted = before_arr.filter(n => !board[r][c].includes(n));
        if (board[r][c].length < before && actually_deleted.length > 0) {
            changed = true;
            eliminated_cells.push(`${getRowLetter(r+1)}${c+1}`);
            actually_deleted.forEach(n => eliminated_nums.add(n));
        }
    }

    if (changed && eliminated_cells.length > 0 && !state.silentMode) {
        log_process(`[${region_type}区块排除_${nat}] ${region_index}${region_type}统一删去数字${[...eliminated_nums].join('、')}，位置${eliminated_cells.join('、')}`);
    }

    return changed;
}

function check_special_combination_region_block_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '特定组合' || region.type === '合并特定组合') {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // log_process(`[特定组合区块排除] 检查第${region.index}特定组合，数字${region.clue_nums.join('、')}`);
            // if (special_combination_region_block_elimination(board, size, region.cells, region.clue_nums, region.type, region.index)) return;
            if (special_combination_region_block_elimination(board, size, region.cells, region.type, region.index, nat)) return;
        }
    }
    return has_conflict;
}

/**
 * 多特定组合区块排除
 * 1. 获取所有特定组合
 * 2. 标记每个区域的格子属于哪些宫/行/列
 * 3. 找出有共同宫/行/列的两个区域，合并格子和数字，作为一个新的特定组合进行区块排除
 */
function check_multi_special_combination_region_block_elimination(board, size, nat = 1) {
    // 1. 获取所有特定组合
    const regions = get_special_combination_regions(size, state.current_mode);
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;
            
            if (intersection.length > 0) {
                // 5. 合并格子和数字，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];
                // const merged_nums = [
                //     ...regions[i].clue_nums,
                //     ...regions[j].clue_nums
                // ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用已有的区块排除函数
                const changed = special_combination_region_block_elimination(
                    board,
                    size,
                    merged_cells,
                    // merged_nums,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return; // 只要有变化就返回
            }
        }
    }
    return false;
}

/**
 * 两个区域组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region1_cells - 区域1所有格子的 [row, col] 坐标数组
 * @param {Array<[number, number]>} region2_cells - 区域2所有格子的 [row, col] 坐标数组
 * @param {string} region1_type - 区域1类型（如 '宫', '行', '列'）
 * @param {number} region1_index - 区域1编号
 * @param {string} region2_type - 区域2类型
 * @param {number} region2_index - 区域2编号
 * @returns {boolean} 是否有变化
 */
function region_pair_block_elimination(board, size, region1_cells, region2_cells, region1_type, region1_index, region2_type, region2_index) {
    let changed = false;
    for (let num = 1; num <= size; num++) {
        // 收集两个区域num的所有候选格
        const region1_candidates = [];
        const region2_candidates = [];
        for (const [r, c] of region1_cells) {
            const cell = board[r][c];
            if (Array.isArray(cell) && cell.includes(num)) {
                region1_candidates.push([r, c]);
            }
        }
        for (const [r, c] of region2_cells) {
            const cell = board[r][c];
            if (Array.isArray(cell) && cell.includes(num)) {
                region2_candidates.push([r, c]);
            }
        }
        if (region1_candidates.length < 1 || region2_candidates.length < 1) continue;

        // 检查第一个区域的候选格是否在某两行/列
        const region1_rows = new Set(region1_candidates.map(([r, _]) => r));
        const region1_cols = new Set(region1_candidates.map(([_, c]) => c));
        const region2_rows = new Set(region2_candidates.map(([r, _]) => r));
        const region2_cols = new Set(region2_candidates.map(([_, c]) => c));

        // 行限制
        if (region1_rows.size <= 2 && region2_rows.size <= 2) {
            const target_rows = new Set([...region1_rows, ...region2_rows]);
            if (target_rows.size <= 2) {
                const excluded_positions = [];
                for (const row of target_rows) {
                    for (let col = 0; col < size; col++) {
                        if (!region1_candidates.some(([r, c]) => r === row && c === col) &&
                            !region2_candidates.some(([r, c]) => r === row && c === col)) {
                            const cell = board[row][col];
                            if (Array.isArray(cell) && cell.includes(num)) {
                                board[row][col] = cell.filter(n => n !== num);
                                excluded_positions.push([row, col]);
                                changed = true;
                            }
                        }
                    }
                }
                if (changed && excluded_positions.length > 0) {
                    let score_sum = 0;
                    if (!state.silentMode) {
                        // 分值计算
                        
                        let score_sum1 = 1;
                        let score_sum2 = 1;
                        // 只统计两个区域内的候选格
                        for (const [r, c] of region1_cells) {
                            const key = `${r},${c},${num}`;
                            const score = state.candidate_elimination_score[key] || 0;
                            if (score > 0) {
                                score_sum1 += 1 / score;
                                // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                            }
                        }
                        score_sum1 = score_sum1 * region1_candidates.length;
                        for (const [r, c] of region2_cells) {
                            const key = `${r},${c},${num}`;
                            const score = state.candidate_elimination_score[key] || 0;
                            if (score > 0) {
                                score_sum2 += 1 / score;
                                // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                            }
                        }
                        score_sum2 = score_sum2 * region2_candidates.length;
                        score_sum = score_sum1 + score_sum2;
                        score_sum = Math.round(score_sum * 100) / 100;

                        // 给被删掉的候选数加分
                        for (const [row, col] of excluded_positions) {
                            const key = `${row},${col},${num}`;
                            if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                            state.candidate_elimination_score[key] += 1 / score_sum;
                        }
                    }

                    const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const excluded_cells_str = excluded_positions.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[${region1_type}-${region2_type}组合区块] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在行${[...target_rows].map(r => getRowLetter(r + 1)).join('、')}，删除${excluded_cells_str}的${num}，分值=${score_sum}`);
                    }
                    return true;
                }
            }
        }

        // 列限制
        if (region1_cols.size <= 2 && region2_cols.size <= 2) {
            const target_cols = new Set([...region1_cols, ...region2_cols]);
            if (target_cols.size <= 2) {
                const excluded_positions = [];
                for (const col of target_cols) {
                    for (let row = 0; row < size; row++) {
                        if (!region1_candidates.some(([r, c]) => r === row && c === col) &&
                            !region2_candidates.some(([r, c]) => r === row && c === col)) {
                            const cell = board[row][col];
                            if (Array.isArray(cell) && cell.includes(num)) {
                                board[row][col] = cell.filter(n => n !== num);
                                excluded_positions.push([row, col]);
                                changed = true;
                            }
                        }
                    }
                }
                if (changed && excluded_positions.length > 0) {
                    let score_sum = 0;
                    if (!state.silentMode) {    
                        // 分值计算
                        
                        let score_sum1 = 1;
                        let score_sum2 = 1;
                        // 只统计两个区域内的候选格
                        for (const [r, c] of region1_cells) {
                            const key = `${r},${c},${num}`;
                            const score = state.candidate_elimination_score[key] || 0;
                            if (score > 0) {
                                score_sum1 += 1 / score;
                                // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                            }
                        }
                        score_sum1 = score_sum1 * region1_candidates.length;
                        for (const [r, c] of region2_cells) {
                            const key = `${r},${c},${num}`;
                            const score = state.candidate_elimination_score[key] || 0;
                            if (score > 0) {
                                score_sum2 += 1 / score;
                                // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                            }
                        }
                        score_sum2 = score_sum2 * region2_candidates.length;
                        score_sum = score_sum1 + score_sum2;
                        score_sum = Math.round(score_sum * 100) / 100;

                        // 给被删掉的候选数加分
                        for (const [row, col] of excluded_positions) {
                            const key = `${row},${col},${num}`;
                            if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                            state.candidate_elimination_score[key] += 1 / score_sum;
                            // log_process(`给${getRowLetter(row + 1)}${col + 1}的${num}加分，当前分值=${state.candidate_elimination_score[key]}`);
                        }
                    }

                    const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const excluded_cells_str = excluded_positions.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[${region1_type}-${region2_type}组合区块] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在列${[...target_cols].map(c => c + 1).join('、')}，删除${excluded_cells_str}的${num}，分值=${score_sum}`);
                    }
                    return true;
                }
            }
        }
    }
    return false;
}
// ...existing code...

/**
 * 宫组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @returns {boolean} 是否有变化
 */
function check_box_pair_block_elimination(board, size) {
    let has_conflict = false;
    // 用get_all_regions生成所有宫区域
    const regions = get_all_regions(size, state.current_mode).filter(r => r.type === '宫');
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            if (region_pair_block_elimination(
                board,
                size,
                regions[i].cells,
                regions[j].cells,
                '宫',
                regions[i].index,
                '宫',
                regions[j].index
            )) {
                return;
            }
        }
    }
    return false;
}

/**
 * 额外区域组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @returns {boolean} 是否有变化
 */
function check_extra_region_pair_block_elimination(board, size) {
    let has_conflict = false;
    // 获取所有非行/列的区域（即变型区域）
    const regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type !== '行' && r.type !== '列');
    for (let i = 0; i < regions.length; i++) {
        const regA = regions[i];
        // 区域必须为数组
        if (!Array.isArray(regA.cells)) continue;
        // 统计区域A可能出现的数字并集（跳过黑格）
        const unionA = new Set();
        for (const [r, c] of regA.cells) {
            const cell = board[r][c];
            if (cell === -1) continue;
            if (typeof cell === 'number') {
                if (cell !== -1) unionA.add(cell);
            } else if (Array.isArray(cell)) {
                for (const n of cell) unionA.add(n);
            }
        }
        // 并集大小必须等于区域格子数（即覆盖所有数字范围）
        if (unionA.size !== regA.cells.length) continue;

        for (let j = i + 1; j < regions.length; j++) {
            const regB = regions[j];
            // 区域必须为数组
            if (!Array.isArray(regB.cells)) continue;
            // 统计区域B可能出现的数字并集（跳过黑格）
            const unionB = new Set();
            for (const [r, c] of regB.cells) {
                const cell = board[r][c];
                if (cell === -1) continue;
                if (typeof cell === 'number') {
                    if (cell !== -1) unionB.add(cell);
                } else if (Array.isArray(cell)) {
                    for (const n of cell) unionB.add(n);
                }
            }
            // 并集大小必须等于区域格子数（即覆盖所有数字范围）
            if (unionB.size !== regB.cells.length) continue;
            // 限制条件：两个区域的候选格不能有重叠
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const overlap = [...set1].some(pos => set2.has(pos));
            if (overlap) continue;
            if (region_pair_block_elimination(
                board,
                size,
                regions[i].cells,
                regions[j].cells,
                regions[i].type,
                regions[i].index,
                regions[j].type,
                regions[j].index
            )) {
                return;
            }
        }
    }
    return false;
}

/**
 * 通用区域显性数组（数对/三数组/四数组）排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {number} subset_size - 显性数组大小（2/3/4）
 * @param {string} region_type - 区域类型（如 '宫', '行', '列'）
 * @param {number} region_index - 区域编号（如第几宫/行/列，1开始）
 * @returns {boolean} 是否有变化
 */
function region_naked_subset_elimination(board, size, region_cells, subset_size, region_type, region_index) {
    let changed = false;
    // 收集所有候选格及其候选数
    const candidates = [];
    for (const [r, c] of region_cells) {
        const cell = board[r][c];
        if (Array.isArray(cell)) {
            if (cell.length === 0) {
                if (!state.silentMode) log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                return true;
            }
            candidates.push({ pos: [r, c], nums: [...cell] });
        }
    }
    // 只保留候选数少于或等于 subset_size 的格子
    const filtered_candidates = candidates.filter(c => c.nums.length <= subset_size);
    // 枚举所有 subset_size 个格子的组合
    const combinations = getCombinations(filtered_candidates, subset_size);

    for (const combo of combinations) {
        // 合并所有候选数
        const union_nums = [...new Set(combo.flatMap(c => c.nums))];
        if (union_nums.length === subset_size) {
            let affected_cells = [];
            // 先尝试删数
            // 记录每个格子被删掉的数字
            const deleted_map = new Map();
            for (const cell of candidates) {
                if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                    const original_length = cell.nums.length;
                    const deleted_nums = cell.nums.filter(n => union_nums.includes(n));
                    if (deleted_nums.length > 0) {
                        deleted_map.set(`${cell.pos[0]},${cell.pos[1]}`, deleted_nums);
                    }
                    cell.nums = cell.nums.filter(n => !union_nums.includes(n));
                    board[cell.pos[0]][cell.pos[1]] = cell.nums;
                    if (cell.nums.length < original_length) {
                        affected_cells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                    }
                }
            }
            // 只有真的删数后才计算分值和加分
            if (affected_cells.length > 0) {
                let score_sum = 0;
                if (!state.silentMode) {    
                    // 分值计算
                    
                    for (const c of combo) {
                        const [r, col] = c.pos;
                        for (let other = 1; other <= size; other++) {
                            if (!union_nums.includes(other)) {
                                const key = `${r},${col},${other}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum += 1 / score;
                                }
                            }
                        }
                    }
                    score_sum *= (candidates.length - combo.length) * combo.length;
                    score_sum = Math.round(score_sum * 100) / 100;
        
                    // 给被删掉的数字加分
                    for (const [pos, deleted_nums] of deleted_map.entries()) {
                        const [row, col] = pos.split(',').map(Number);
                        for (const n of deleted_nums) {
                            const key = `${row},${col},${n}`;
                            if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                            state.candidate_elimination_score[key] += 1 / score_sum;
                            // log_process(`    候选数 ${getRowLetter(row+1)}${col+1} 的 ${n} 分值贡献 +${(1/score_sum).toFixed(2)}`);
                        }
                    }
                }

                const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                const subset_cells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                if (!state.silentMode) log_process(`[${region_type}显性${subset_name}] 第${region_index}${region_type}的${subset_cells}构成${subset_name}${union_nums.join('')}，排除${affected_cells.join('、')}的${union_nums.join('、')}，分值=${score_sum}`);
                return true;
            }
        }
    }
    // ...existing code...
    // ...existing code...
    return false;
}

// 宫显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除宫内其他格的候选数，调用通用核心函数
function check_box_naked_subset_elimination(board, size, subset_size = 2) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '宫') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 行列显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除本行/本列其他格的候选数，调用通用核心函数
function check_row_col_naked_subset_elimination(board, size, subset_size = 2) {
    let has_conflict = false;
    // 用统一区域生成方式处理行列
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '行' || region.type === '列') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 额外区域显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除对角线内其他格的候选数，调用通用核心函数
function check_extra_region_naked_subset_elimination(board, size, subset_size = 2) {
    // 用统一区域生成方式处理对角线
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return false;
}

/**
 * 通用隐性数组（数对/三数组/四数组）核心函数（仿宫隐性数对实现风格）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {number} subset_size - 隐性数组大小（2/3/4）
 * @param {string} region_type - 区域类型（如 '宫', '行', '列'）
 * @param {number} region_index - 区域编号（如第几宫/行/列，1开始）
 * @returns {boolean} 是否有变化
 */
function region_hidden_subset_elimination(board, size, region_cells, subset_size, region_type, region_index) {
    let has_conflict = false;
    // 收集所有候选格
    const candidate_cells = [];
    for (const [r, c] of region_cells) {
        if (Array.isArray(board[r][c])) {
            if (board[r][c].length === 0) {
                has_conflict = true;
                if (!state.silentMode) log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                return true;
            }
            candidate_cells.push([r, c]);
        }
    }
    // 检查所有数字组合
    const nums = Array.from({length: size}, (_, i) => i + 1);
    const filtered_nums = nums.filter(num => {
        let count = 0;
        for (const [r, c] of candidate_cells) {
            if (board[r][c].includes(num)) count++;
        }
        return count <= subset_size && count > 0;
    });
    const num_combinations = getCombinations(filtered_nums, subset_size);

    for (const num_group of num_combinations) {
        // 统计这些数字在哪些格子中出现
        const positions = [];
        for (const [r, c] of candidate_cells) {
            if (num_group.some(n => board[r][c].includes(n))) {
                positions.push([r, c]);
            }
        }
        // 只出现在 subset_size 个格子中
        if (positions.length === subset_size) {
            // // 检查这些格子是否都包含这些数字（可选，严格可不加）
            // let is_subset = true;
            // for (const [r, c] of positions) {
            //     if (!num_group.every(n => board[r][c].includes(n))) {
            //         is_subset = false;
            //         break;
            //     }
            // }
            // if (is_subset) {
                let modified = false;
                let deleted_cells = [];
                let deleted_detail = [];

                let score_sum = 0;
                if (!state.silentMode) {    
                    // 分值计算：加区域内其他格子（不在positions内）对应数对组中数字的分值
                    
                    for (const [r, c] of region_cells) {
                        // 跳过隐性数组本身的格子
                        if (positions.some(([pr, pc]) => pr === r && pc === c)) continue;
                        if (Array.isArray(board[r][c])) {
                            for (const n of num_group) {
                                const key = `${r},${c},${n}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum += 1 / score;
                                }
                            }
                        }
                    }
                    score_sum *= (candidate_cells.length - positions.length) * positions.length;
                    score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
                }

                // 删除隐性数组格子中非num_group的数字，并给被删掉的数字加分
                for (const [r, c] of positions) {
                    const before = board[r][c].length;
                    const deleted = board[r][c].filter(n => !num_group.includes(n));
                    board[r][c] = board[r][c].filter(n => num_group.includes(n));
                    if (board[r][c].length < before && deleted.length > 0) {
                        modified = true;
                        deleted_cells.push(`${getRowLetter(r+1)}${c+1}`);
                        deleted_detail.push(`${getRowLetter(r+1)}${c+1}的${deleted.join('、')}`);
                        if (!state.silentMode) {    
                            // 分值加到被删掉的数字上
                            for (const n of deleted) {
                                const key = `${r},${c},${n}`;
                                if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                                state.candidate_elimination_score[key] += 1 / score_sum;
                            }
                        }
                    }
                }
                if (modified) {
                    const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                    const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                    let detail_msg = deleted_detail.length > 0 ? `，删除${deleted_detail.join('，')}` : '';
                    if (!state.silentMode) {
                        log_process(`[${region_type}隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}${detail_msg}，分值=${score_sum}`);
                    }
                    return true;
                }
            // }
        }
    }
    return has_conflict;
}

// 宫隐性数对组
function check_box_hidden_subset_elimination(board, size, subset_size = 2) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

        // 如果是缺一门数独模式，执行特殊排除逻辑
    if (state.current_mode === 'missing') {
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];
                const num_positions = {};
                const missing_nums = [];
                const existing_nums = new Set();

                // 1. 先收集宫中已存在的数字
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
                            existing_nums.add(board[r][c]);
                        }
                    }
                }

                // 2. 统计数字在宫中的候选格位置（跳过黑格和已存在的数字）
                for (let num = 1; num <= size; num++) {
                    if (existing_nums.has(num)) continue;
                    num_positions[num] = [];
                    for (let r = start_row; r < start_row + box_size[0]; r++) {
                        for (let c = start_col; c < start_col + box_size[1]; c++) {
                            if (board[r][c] === -1) continue;
                            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                                num_positions[num].push([r, c]);
                            }
                        }
                    }
                    // 记录没有可填位置的数字
                    if (num_positions[num].length === 0) {
                        missing_nums.push(num);
                    }
                }

                // 检查是否有欠一数对组标记
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                const subset_info = state.box_missing_subsets[`box_${box_num}`];

                // 3. 如果满足条件（有缺失数字或已有数对组标记）
                if (missing_nums.length === 1 || subset_info) {
                    // 检查1-size的所有数字组合（根据subset_size决定组合大小）
                    const nums = Array.from({length: size}, (_, i) => i + 1)
                        .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
                    const num_combinations = getCombinations(nums, subset_size);

                    for (const num_group of num_combinations) {
                        // 如果有欠一数对组标记，跳过已标记的数字组合
                        if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

                        // 统计这些数字在哪些候选格中出现
                        const positions = [];
                        for (let r = start_row; r < start_row + box_size[0]; r++) {
                            for (let c = start_col; c < start_col + box_size[1]; c++) {
                                if (board[r][c] === -1) continue;
                                if (Array.isArray(board[r][c]) && 
                                    num_group.some(n => board[r][c].includes(n))) {
                                    positions.push([r, c]);
                                }
                            }
                        }

                        // 如果这些数字出现的候选格正好等于子集大小
                        if (positions.length === subset_size) {
                            // 检查这些格子是否都包含这些数字
                            let is_subset = true;
                            for (const [r, c] of positions) {
                                if (!num_group.every(n => board[r][c].includes(n))) {
                                    is_subset = false;
                                    break;
                                }
                            }

                            if (is_subset) {
                                let modified = false;
                                // 从这些格子中删除其他数字
                                for (const [r, c] of positions) {
                                    const original_length = board[r][c].length;
                                    board[r][c] = board[r][c].filter(n => num_group.includes(n));
                                    if (board[r][c].length < original_length) {
                                        modified = true;
                                    }
                                }

                                if (modified) {
                                    const subset_name = 
                                        subset_size === 2 ? '数对' : 
                                        subset_size === 3 ? '三数组' : '四数组';
                                    const cells = positions.map(([r, c]) => 
                                        `${getRowLetter(r+1)}${c+1}`).join('、');
                                    if (!state.silentMode) {
                                        log_process(`[宫隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                                    }

                                    // 记录欠一数对组信息
                                    state.box_missing_subsets[`box_${box_num}`] = {
                                        nums: num_group,
                                        positions: positions.map(([r, c]) => `${r},${c}`)
                                    };
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '宫') {
                if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
            }
        }
    }
    return has_conflict;
}

// 行列隐性数对组
function check_row_col_hidden_subset_elimination(board, size, subset_size = 2) {
    let has_conflict = false;

    // 如果是缺一门数独模式，执行特殊排除逻辑
    if (state.current_mode === 'missing') {
        // 行隐性数组逻辑
        for (let row = 0; row < size; row++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集行中已存在的数字
            for (let col = 0; col < size; col++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let col = 0; col < size; col++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(col);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查是否有欠一数对组标记
            const subset_info = state.row_missing_subsets[`row_${row}`];

            // 4. 检测隐性数组
            if (subset_size >= 2 && subset_size <= 4) {
                const all_nums = Array.from({length: size}, (_, i) => i + 1)
                    .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
                const num_combinations = getCombinations(all_nums, subset_size);

                for (const num_group of num_combinations) {
                    // 跳过已标记的数字组合
                    if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

                    // 统计这些数字在哪些候选格中出现
                    const positions = new Set();
                    for (const num of num_group) {
                        if (num_positions[num]) {
                            for (const col of num_positions[num]) {
                                positions.add(col);
                            }
                        }
                    }

                    // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
                    if (positions.size === subset_size - 1) {
                        const pos_array = Array.from(positions);
                        
                        // 检查这些格子是否都包含至少两个目标数字
                        let is_valid = true;
                        for (const col of pos_array) {
                            const cell = board[row][col];
                            const count = num_group.filter(n => cell.includes(n)).length;
                            if (count < 2) {
                                is_valid = false;
                                break;
                            }
                        }

                        if (is_valid) {
                            let modified = false;
                            // 从这些格子中删除其他数字
                            for (const col of pos_array) {
                                const original_length = board[row][col].length;
                                board[row][col] = board[row][col].filter(n => num_group.includes(n));
                                if (board[row][col].length < original_length) {
                                    modified = true;
                                }
                            }

                            if (modified) {
                                const subset_name = 
                                    subset_size === 2 ? '数对' : 
                                    subset_size === 3 ? '三数组' : '四数组';
                                const cells = pos_array.map(col => 
                                    `${getRowLetter(row+1)}${col+1}`).join('、');
                                if (!state.silentMode) {
                                    log_process(`[行隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                                }

                                // 记录欠一数对组信息
                                state.row_missing_subsets[`row_${row}`] = {
                                    nums: num_group,
                                    positions: pos_array.map(col => `${row},${col}`)
                                };
                                return; // 每次只处理一个发现
                            }
                        }
                    }
                }
            }
        }

        // 列隐性数组逻辑
        for (let col = 0; col < size; col++) {
            const num_positions = {};
            const missing_nums = [];
            const existing_nums = new Set();

            // 1. 收集列中已存在的数字
            for (let row = 0; row < size; row++) {
                if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
                    existing_nums.add(board[row][col]);
                }
            }

            // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
            for (let num = 1; num <= size; num++) {
                if (existing_nums.has(num)) continue;
                num_positions[num] = [];
                
                for (let row = 0; row < size; row++) {
                    if (board[row][col] === -1) continue;
                    if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
                        num_positions[num].push(row);
                    }
                }
                
                // 记录没有可填位置的数字
                if (num_positions[num].length === 0) {
                    missing_nums.push(num);
                }
            }

            // 3. 检查是否有欠一数对组标记
            const subset_info = state.col_missing_subsets[`col_${col}`];

            // 4. 检测隐性数组
            if (subset_size >= 2 && subset_size <= 4) {
                const all_nums = Array.from({length: size}, (_, i) => i + 1)
                    .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
                const num_combinations = getCombinations(all_nums, subset_size);

                for (const num_group of num_combinations) {
                    // 跳过已标记的数字组合
                    if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

                    // 统计这些数字在哪些候选格中出现
                    const positions = new Set();
                    for (const num of num_group) {
                        if (num_positions[num]) {
                            for (const row of num_positions[num]) {
                                positions.add(row);
                            }
                        }
                    }

                    // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
                    if (positions.size === subset_size - 1) {
                        const pos_array = Array.from(positions);
                        
                        // 检查这些格子是否都包含至少两个目标数字
                        let is_valid = true;
                        for (const row of pos_array) {
                            const cell = board[row][col];
                            const count = num_group.filter(n => cell.includes(n)).length;
                            if (count < 2) {
                                is_valid = false;
                                break;
                            }
                        }

                        if (is_valid) {
                            let modified = false;
                            // 从这些格子中删除其他数字
                            for (const row of pos_array) {
                                const original_length = board[row][col].length;
                                board[row][col] = board[row][col].filter(n => num_group.includes(n));
                                if (board[row][col].length < original_length) {
                                    modified = true;
                                }
                            }

                            if (modified) {
                                const subset_name = 
                                    subset_size === 2 ? '数对' : 
                                    subset_size === 3 ? '三数组' : '四数组';
                                const cells = pos_array.map(row => 
                                    `${getRowLetter(row+1)}${col+1}`).join('、');
                                if (!state.silentMode) {
                                    log_process(`[列隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                                }

                                // 记录欠一数对组信息
                                state.col_missing_subsets[`col_${col}`] = {
                                    nums: num_group,
                                    positions: pos_array.map(row => `${row},${col}`)
                                };
                                return; // 每次只处理一个发现
                            }
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        // 用统一区域生成方式处理行列
        const regions = get_all_regions(size, state.current_mode);
        for (const region of regions) {
            if (region.type === '行' || region.type === '列') {
                if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
            }
        }
    }
    return has_conflict;
}

// 额外区域隐性数对组
function check_extra_region_hidden_subset_elimination(board, size, subset_size = 2) {
    // 用统一区域生成方式处理所有非宫/行/列的区域
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            // 统计该区域所有格子中“可能出现”的数字并集（包括已定数字与候选数），跳过黑格
            const unionSet = new Set();
            for (const [r, c] of region.cells) {
                const cell = board[r][c];
                if (cell === -1) continue; // 黑格
                if (typeof cell === 'number') {
                    if (cell !== -1) unionSet.add(cell);
                } else if (Array.isArray(cell)) {
                    for (const n of cell) unionSet.add(n);
                }
            }

            // 只有当并集大小等于 size 时，说明该变型区域覆盖了所有数字范围，才进行变型区域排除
            // log_process(`[额外区域排除] 检查${region.type}${region.index}，数字并集大小=${unionSet.size}`);
            if (unionSet.size !== region.cells.length) continue;
            if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return false;
}