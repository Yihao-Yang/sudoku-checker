import { state } from '../modules/state.js';
import { show_result, log_process } from '../modules/core.js';
import { eliminate_Candidates, isEqual, getCombinations, getRowLetter } from './solver_tool.js';
import { get_all_mark_lines, get_cells_on_line } from "../modules/multi_diagonal.js";


export function solve_By_Elimination(board, size) {
    // 重置欠一数组状态
    state.box_missing_subsets = {};
    state.row_missing_subsets = {};
    state.col_missing_subsets = {};
    
    let changed;
    // 添加技巧使用计数器
    const technique_counts = {
        "唯余法": 0,
        "宫排除": 0,
        "一刀流宫排除": 0,
        "行列排除": 0,
        "对角线排除": 0,
        "宫区块": 0,
        "一刀流宫区块": 0,
        "宫组合区块": 0,
        "行列区块": 0,
        "对角线区块": 0,
        "宫显性数对": 0,
        "行列显性数对": 0,
        "对角线显性数对": 0,
        "宫显性三数组": 0,
        "行列显性三数组": 0,
        "对角线显性三数组": 0,
        "宫显性四数组": 0,
        "行列显性四数组": 0,
        "对角线显性四数组": 0,
        "宫隐性数对": 0,
        "行列隐性数对": 0,
        "对角线隐性数对": 0,
        "宫隐性三数组": 0,
        "行列隐性三数组": 0,
        "对角线隐性三数组": 0,
        "宫隐性四数组": 0,
        "行列隐性四数组": 0,
        "对角线隐性四数组": 0,
        "欠一排除": 0
    };

    let total_score = 0;
    // 技巧分值表
    const technique_scores = {
        // 唯余法分值细分，行列排除法分值细分，对角线排除法分值细分
        "唯余法_1": 0,
        "唯余法_2": 1,
        "唯余法_3": 5,
        "唯余法_4": 30,
        "唯余法_5": 50,
        "唯余法_6": 80,
        "唯余法_7": 90,
        "唯余法_8": 100,
        "唯余法_9": 110,
        "行列排除_1": 0,
        "行列排除_2": 1,
        "行列排除_3": 5,
        "行列排除_4": 30,
        "行列排除_5": 50,
        "行列排除_6": 80,
        "行列排除_7": 90,
        "行列排除_8": 100,
        "行列排除_9": 110,
        "对角线排除_1": 0,
        "对角线排除_2": 1,
        "对角线排除_3": 5,
        "对角线排除_4": 30,
        "对角线排除_5": 50,
        "对角线排除_6": 80,
        "对角线排除_7": 90,
        "对角线排除_8": 100,
        "对角线排除_9": 110,
        // 其他技巧分值
        "宫排除": 2,
        "一刀流宫排除": 2,
        "宫区块": 10,
        "一刀流宫区块": 10,
        "对角线区块": 15,
        "宫隐性数对": 30,
        "对角线隐性数对": 40,
        "宫组合区块": 40,
        "行列区块": 40,
        "宫隐性三数组": 70,
        "对角线隐性三数组": 100,
        "宫显性数对": 80,
        "行列显性数对": 90,
        "对角线显性数对": 120,
        "行列隐性数对": 200,
        "宫显性三数组": 250,
        "行列显性三数组": 300,
        "对角线显性三数组": 340,
        "宫隐性四数组": 350,
        "行列隐性三数组": 400,
        "宫显性四数组": 500,
        "行列显性四数组": 550,
        "对角线显性四数组": 550,
        "行列隐性四数组": 600,
        "对角线隐性四数组": 600,

        // 欠一排除分值细分
        "欠一宫数对": 200,
        "欠一宫三数组": 400,
        "欠一宫四数组": 600,
        "欠一行列数对": 400,
        "欠一行列三数组": 600,
        "欠一行列四数组": 800,
    };

    const techniqueGroups = [
        // 第一优先级：余1数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination_1 && check_cell_elimination(board, size, 1)],
        // 第二优先级：余2数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination_2 && check_cell_elimination(board, size, 2)],
        // 第三优先级：宫排除法
    ...Array.from({length: size}, (_, i) => [() => state.techniqueSettings?.Box_Elimination && check_Box_Elimination(board, size, i + 1)]),
        [() => state.techniqueSettings?.Box_One_Cut && check_Box_Elimination_One_Cut(board, size)],
        // 第三优先级：对角线排除法
    ...Array.from({length: size}, (_, i) => [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Elimination && check_Diagonal_Elimination(board, size, i + 1)]),
        // 第四优先级：余3数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination_3 && check_cell_elimination(board, size, 3)],
        // 第五优先级：行列排除法
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 1)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 2)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 3)],



        
        
        

        // 第六优先级：宫区块，对角线区块
        [() => state.techniqueSettings?.Box_Block && check_box_block_elimination(board, size)],
        [() => state.techniqueSettings?.Box_Block_One_Cut && check_box_block_elimination_One_Cut(board, size)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Block && check_Diagonal_Block_Elimination(board, size)],
        // 第七优先级：组合区块
        [() => state.techniqueSettings?.Box_Pair_Block && check_box_pair_block_elimination(board, size)],
        


        // 第八优先级：余4，5数的所有排除法
        [() => state.techniqueSettings?.Cell_Elimination_4 && check_cell_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 4)],

        [() => state.techniqueSettings?.Cell_Elimination_5 && check_cell_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 5)],

        // 第九优先级：行列区块
        [() => state.techniqueSettings?.Row_Col_Block && check_Row_Col_Block_Elimination(board, size)],

        // 第十优先级：余6-9数的所有排除法
        [() => state.techniqueSettings?.Cell_Elimination_6 && check_cell_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 6)],
        [() => state.techniqueSettings?.Cell_Elimination_7 && check_cell_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 7)],
        [() => state.techniqueSettings?.Cell_Elimination_8 && check_cell_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 8)],
        [() => state.techniqueSettings?.Cell_Elimination_9 && check_cell_elimination(board, size, 9)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 9)],





        // 第十一优先级：宫隐性数对，对角线隐性数对
        [() => state.techniqueSettings?.Box_Hidden_Pair && check_box_hidden_subset_elimination(board, size, 2)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Hidden_Pair && check_diagonal_hidden_subset_elimination(board, size, 2)],
        // 第十二优先级：宫隐性三数组，对角线隐性三数组
        [() => state.techniqueSettings?.Box_Hidden_Triple && check_box_hidden_subset_elimination(board, size, 3)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Hidden_Triple && check_diagonal_hidden_subset_elimination(board, size, 3)],
        // 第十三优先级：宫显性数对，对角线显性数对
        [() => state.techniqueSettings?.Box_Naked_Pair && check_box_naked_subset_elimination(board, size, 2)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Naked_Pair && check_diagonal_naked_subset_elimination(board, size, 2)],
        // 第十四优先级：行列显性数对
        [() => (state.techniqueSettings?.Row_Col_Naked_Pair) && check_row_col_naked_subset_elimination(board, size, 2)],
        

        // 第十四点五优先级：宫隐性欠一数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 2)],//缺一门宫隐性欠一数对
        // 第十五优先级：行列隐性数对
        [() => (state.techniqueSettings?.Row_Col_Hidden_Pair) && check_row_col_hidden_subset_elimination(board, size, 2)],
        
        // 第十六优先级：行列隐性三数组
        [() => (state.techniqueSettings?.Row_Col_Hidden_Triple) && check_row_col_hidden_subset_elimination(board, size, 3)],
        
        // 第十六点五优先级：行列隐性欠一数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 2)],//缺一门行列隐性欠一数对
        // 第十七优先级：宫显性三数组，对角线显性三数组
        [() => state.techniqueSettings?.Box_Naked_Triple && check_box_naked_subset_elimination(board, size, 3)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Naked_Triple && check_diagonal_naked_subset_elimination(board, size, 3)],
        // 第十八优先级：行列显性三数组
        [() => (state.techniqueSettings?.Row_Col_Naked_Triple) && check_row_col_naked_subset_elimination(board, size, 3)],
        // 第十八点五优先级：宫行列隐性欠一三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 3)],//缺一门宫隐性欠一三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 3)],//缺一门行列隐性欠一三数组




        // 第十九优先级：宫隐性四数组，对角线隐性四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],//缺一门宫隐性欠一四数组
        [() => state.techniqueSettings?.Box_Hidden_Quad && check_box_hidden_subset_elimination(board, size, 4)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Hidden_Quad && check_diagonal_hidden_subset_elimination(board, size, 4)],
        // 第二十优先级：行列隐性四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],
        [() => (state.techniqueSettings?.Row_Col_Hidden_Quad) && check_row_col_hidden_subset_elimination(board, size, 4)],
        

        // 第二十一优先级：宫显性四数组，对角线显性四数组
        [() => state.techniqueSettings?.Box_Naked_Quad && check_box_naked_subset_elimination(board, size, 4)],
        [() => state.current_mode === 'diagonal' && state.techniqueSettings?.Diagonal_Naked_Quad && check_diagonal_naked_subset_elimination(board, size, 4)],
        // 第二十二优先级：行列显性四数组
        [() => (state.techniqueSettings?.Row_Col_Naked_Quad) && check_row_col_naked_subset_elimination(board, size, 4)],
        
        // 第二十二点五优先级：宫行列隐性欠一四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],//缺一门宫隐性欠一四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],//缺一门行列隐性欠一四数组

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
                        let nat = technique.toString().match(/check_\w+\(([^,]+),\s*[^,]+,\s*(\d+)/)?.[2]; // 获取nat参数
                        if (technique_name) {
                            let chinese_name;
                            let score_key;
                            if (technique_name.startsWith('Cell_Elimination_')) {
                                chinese_name = "唯余法";
                                score_key = `唯余法_${technique_name.split('_')[2]}`;
                            } else {
                                // 映射英文名到中文名
                                switch(technique_name) {
                                    case 'Cell_Elimination':
                                        chinese_name = "唯余法";
                                        score_key = nat ? `唯余法_${nat}` : "唯余法_1";
                                        break;
                                    case 'Row_Col_Elimination':
                                        chinese_name = "行列排除";
                                        score_key = nat ? `行列排除_${nat}` : "行列排除_1";
                                        break;
                                    case 'Diagonal_Elimination':
                                        chinese_name = "对角线排除";
                                        score_key = nat ? `对角线排除_${nat}` : "对角线排除_1";
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

                                    // case 'Cell_Elimination': chinese_name = "唯余法"; break;
                                    case 'Box_Elimination':
                                        chinese_name = "宫排除";
                                        score_key = "宫排除";
                                        break;
                                    case 'Box_One_Cut':
                                        chinese_name = "一刀流宫排除";
                                        score_key = "一刀流宫排除";
                                        break;
                                    // case 'Row_Col_Elimination': chinese_name = "行列排除"; break;
                                    case 'Box_Block':
                                        chinese_name = "宫区块";
                                        score_key = "宫区块";
                                        break;
                                    case 'Box_Block_One_Cut':
                                        chinese_name = "一刀流宫区块";
                                        score_key = "一刀流宫区块";
                                        break;
                                    case 'Box_Pair_Block':
                                        chinese_name = "宫组合区块";
                                        score_key = "宫组合区块";
                                        break;
                                    case 'Row_Col_Block':
                                        chinese_name = "行列区块";
                                        score_key = "行列区块";
                                        break;
                                    case 'Diagonal_Block':
                                        chinese_name = "对角线区块";
                                        score_key = "对角线区块";
                                        break;
                                    case 'Box_Naked_Pair':
                                        chinese_name = "宫显性数对";
                                        score_key = "宫显性数对";
                                        break;
                                    case 'Row_Col_Naked_Pair':
                                        chinese_name = "行列显性数对";
                                        score_key = "行列显性数对";
                                        break;
                                    case 'Diagonal_Naked_Pair':
                                        chinese_name = "对角线显性数对";
                                        score_key = "对角线显性数对";
                                        break;
                                    case 'Box_Naked_Triple':
                                        chinese_name = "宫显性三数组";
                                        score_key = "宫显性三数组";
                                        break;
                                    case 'Row_Col_Naked_Triple':
                                        chinese_name = "行列显性三数组";
                                        score_key = "行列显性三数组";
                                        break;
                                    case 'Diagonal_Naked_Triple':
                                        chinese_name = "对角线显性三数组";
                                        score_key = "对角线显性三数组";
                                        break;
                                    case 'Box_Naked_Quad':
                                        chinese_name = "宫显性四数组";
                                        score_key = "宫显性四数组";
                                        break;
                                    case 'Row_Col_Naked_Quad':
                                        chinese_name = "行列显性四数组";
                                        score_key = "行列显性四数组";
                                        break;
                                    case 'Diagonal_Naked_Quad':
                                        chinese_name = "对角线显性四数组";
                                        score_key = "对角线显性四数组";
                                        break;
                                    case 'Box_Hidden_Pair':
                                        chinese_name = "宫隐性数对";
                                        score_key = "宫隐性数对";
                                        break;
                                    case 'Row_Col_Hidden_Pair':
                                        chinese_name = "行列隐性数对";
                                        score_key = "行列隐性数对";
                                        break;
                                    case 'Diagonal_Hidden_Pair':
                                        chinese_name = "对角线隐性数对";
                                        score_key = "对角线隐性数对";
                                        break;
                                    case 'Box_Hidden_Triple':
                                        chinese_name = "宫隐性三数组";
                                        score_key = "宫隐性三数组";
                                        break;
                                    case 'Row_Col_Hidden_Triple':
                                        chinese_name = "行列隐性三数组";
                                        score_key = "行列隐性三数组";
                                        break;
                                    case 'Diagonal_Hidden_Triple':
                                        chinese_name = "对角线隐性三数组";
                                        score_key = "对角线隐性三数组";
                                        break;
                                    case 'Row_Col_Hidden_Quad':
                                        chinese_name = "行列隐性四数组";
                                        score_key = "行列隐性四数组";
                                        break;
                                    case 'Diagonal_Hidden_Quad':
                                        chinese_name = "对角线隐性四数组";
                                        score_key = "对角线隐性四数组";
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
        if (existing_nums.has(num)) continue;
        let positions = [];
        for (const [r, c] of region_cells) {
            if (board[r][c] === -1) continue;
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                positions.push([r, c]);
            }
        }
        if (existing_nums.size >= size - nat && positions.length === 1) {
            const [row, col] = positions[0];
            board[row][col] = num;
            if (!state.silentMode) log_process(`[${region_type}排除] 第${region_index}${region_type}${getRowLetter(row+1)}${col+1}=${num}`);
            eliminate_Candidates(board, size, row, col, num);
            return;
        } else if (positions.length === 0) {
            has_conflict = true;
            if (!state.silentMode) log_process(`[冲突] ${region_type}${region_index ? region_index : ''}中数字${num}无可填入位置，无解`);
            return true;
        }
    }
    return has_conflict;
}

// 宫排除法
function check_Box_Elimination(board, size, nat = 1) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

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
                            eliminate_Candidates(board, size, row, col, num);
                            return;
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const region_cells = [];
                for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                    for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                        region_cells.push([r, c]);
                    }
                }
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                if (region_elimination(board, size, region_cells, '宫', box_num, nat)) return true;
            }
        }
    }
    return false;
}

// 行列排除法
function check_Row_Col_Elimination(board, size, nat = 1) {
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
                            eliminate_Candidates(board, size, row, col, num);
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
                            eliminate_Candidates(board, size, row, col, num);
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
        // 行
        for (let row = 0; row < size; row++) {
            const region_cells = [];
            for (let col = 0; col < size; col++) {
                region_cells.push([row, col]);
            }
            if (region_elimination(board, size, region_cells, '行', row + 1, nat)) return true;
        }
        // 列
        for (let col = 0; col < size; col++) {
            const region_cells = [];
            for (let row = 0; row < size; row++) {
                region_cells.push([row, col]);
            }
            if (region_elimination(board, size, region_cells, '列', col + 1, nat)) return true;
        }
    }
    return false;
}

// 对角线排除法
function check_Diagonal_Elimination(board, size, nat = 1) {
    // 主对角线
    const main_diag_cells = [];
    for (let i = 0; i < size; i++) main_diag_cells.push([i, i]);
    if (region_elimination(board, size, main_diag_cells, '对角线', 1, nat)) return true;
    // 副对角线
    const anti_diag_cells = [];
    for (let i = 0; i < size; i++) anti_diag_cells.push([i, size - 1 - i]);
    if (region_elimination(board, size, anti_diag_cells, '对角线', 2, nat)) return true;
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
                        eliminate_Candidates(board, size, row, col, num);
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
    const regions = [];

    // 宫
    for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
        for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
            const region_cells = [];
            for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                    region_cells.push([r, c]);
                }
            }
            regions.push({ type: '宫', index: box_row * (size / box_size[1]) + box_col + 1, cells: region_cells });
        }
    }
    // 行
    for (let row = 0; row < size; row++) {
        const region_cells = [];
        for (let col = 0; col < size; col++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '行', index: row + 1, cells: region_cells });
    }
    // 列
    for (let col = 0; col < size; col++) {
        const region_cells = [];
        for (let row = 0; row < size; row++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '列', index: col + 1, cells: region_cells });
    }

    if (state.current_mode === 'diagonal') {
        // 处理对角线
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, size - 1 - i]);
        }
        regions.push({ type: '对角线', index: 1, cells: diag1_cells });
        regions.push({ type: '对角线', index: 2, cells: diag2_cells });
    }

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
                            board[row][col] = num;
                            let region_name = region.type;
                            let region_index = region.index;
                            if (!state.silentMode) log_process(`[唯余法] ${getRowLetter(row + 1)}${col + 1}=${num}（${region_index}${region_name}余${nat}数）`);
                            eliminate_Candidates(board, size, row, col, num);
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
 * 通用区域区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {string} region_type - 区域类型（如 '宫', '行', '列'）
 * @param {number} region_index - 区域编号（如第几宫/行/列，1开始）
 * @returns {boolean} 是否有变化
 */
function region_block_elimination(board, size, region_cells, region_type, region_index) {
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

        // 对每个候选格，模拟eliminate_Candidates，收集所有能删到的位置
        const elimination_sets = [];
        for (const [r, c] of candidate_positions) {
            // 复制board，模拟填入num
            const board_copy = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
            board_copy[r][c] = num;
            const eliminations = eliminate_Candidates(board_copy, size, r, c, num);
            const eliminated_positions = eliminations
                .filter(e => e.eliminated.includes(num))
                .map(e => `${e.row},${e.col}`);
            elimination_sets.push(new Set(eliminated_positions));
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

        // 真正执行删除
        for (const pos of intersection) {
            const [r, c] = pos.split(',').map(Number);
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                board[r][c] = board[r][c].filter(n => n !== num);
                changed = true;
            }
        }
        if (changed) {
            const block_cells = candidate_positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
            const eliminated_cells = [...intersection].map(pos => {
                const [r, c] = pos.split(',').map(Number);
                return `${getRowLetter(r+1)}${c+1}`;
            }).join('、');
            if (!state.silentMode) log_process(`[${region_type}区块排除] 第${region_index}${region_type}的${block_cells}构成${num}区块，删除${eliminated_cells}的${num}`);
            return true;
        }
    }
    return false;
}

// 宫区块排除
function check_box_block_elimination(board, size) {
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
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const region_cells = [];
                for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                    for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                        region_cells.push([r, c]);
                    }
                }
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                if (region_block_elimination(board, size, region_cells, '宫', box_num)) {
                    return;
                }
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
function check_Row_Col_Block_Elimination(board, size) {
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
        // 普通模式
        // 行区块
        for (let row = 0; row < size; row++) {
            const region_cells = [];
            for (let col = 0; col < size; col++) {
                region_cells.push([row, col]);
            }
            if (region_block_elimination(board, size, region_cells, '行', row + 1)) {
                return;
            }
        }
        // 列区块
        for (let col = 0; col < size; col++) {
            const region_cells = [];
            for (let row = 0; row < size; row++) {
                region_cells.push([row, col]);
            }
            if (region_block_elimination(board, size, region_cells, '列', col + 1)) {
                return;
            }
        }
    }
    return has_conflict;
}

// 对角线区块排除（主对角线、副对角线，统一用region_block_elimination处理）
function check_Diagonal_Block_Elimination(board, size) {
    // 主对角线
    const main_diag_cells = [];
    for (let i = 0; i < size; i++) {
        main_diag_cells.push([i, i]);
    }
    // 副对角线
    const anti_diag_cells = [];
    for (let i = 0; i < size; i++) {
        anti_diag_cells.push([i, size - 1 - i]);
    }

    // 主对角线区块排除
    if (region_block_elimination(board, size, main_diag_cells, '对角线', 1)) {
        return;
    }
    // 副对角线区块排除
    if (region_block_elimination(board, size, anti_diag_cells, '对角线', 2)) {
        return;
    }
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
// function region_pair_block_elimination(board, size, region1_cells, region2_cells, region1_type, region1_index, region2_type, region2_index) {
//     let changed = false;
//     for (let num = 1; num <= size; num++) {
//         // 1. 收集两个区域num的所有候选格
//         const region1_candidates = [];
//         const region2_candidates = [];
//         for (const [r, c] of region1_cells) {
//             const cell = board[r][c];
//             if (Array.isArray(cell) && cell.includes(num)) {
//                 region1_candidates.push([r, c]);
//             }
//         }
//         for (const [r, c] of region2_cells) {
//             const cell = board[r][c];
//             if (Array.isArray(cell) && cell.includes(num)) {
//                 region2_candidates.push([r, c]);
//             }
//         }
//         if (region1_candidates.length < 1 || region2_candidates.length < 1) continue;

//         // 2. 对第一个区域的每个候选格，模拟eliminate_Candidates，收集所有能删到的位置
//         const region1_elimination_sets = [];
//         for (const [r1, c1] of region1_candidates) {
//             // 复制board，模拟填入num
//             const board_copy = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
//             board_copy[r1][c1] = num;
//             const eliminations = eliminate_Candidates(board_copy, size, r1, c1, num);
//             const eliminated_positions = eliminations
//                 .filter(e => e.eliminated.includes(num))
//                 .map(e => `${e.row},${e.col}`);
//             region1_elimination_sets.push(new Set(eliminated_positions));
//         }

//         // 3. 如果其在第二个区域有删到数字，再收集第二个区域未被删到的候选格的位置
//         // 4. 统计第二个区域未被删到的候选格所能删除位置的交集，与第一个区域模拟候选格的删数记录放一起，统计为第一个区域那个模拟候选格的总删数记录
//         const region1_total_elimination_sets = [];
//         for (let i = 0; i < region1_candidates.length; i++) {
//             const eliminated_set = region1_elimination_sets[i];
//             // 找出第二个区域被删掉的候选格
//             const eliminated_in_region2 = region2_candidates.filter(([r, c]) => eliminated_set.has(`${r},${c}`));
//             // 找出第二个区域未被删掉的候选格
//             const not_eliminated_in_region2 = region2_candidates.filter(([r, c]) => !eliminated_set.has(`${r},${c}`));
//             // 统计未被删掉的候选格所能删的位置的交集
//             let region2_intersection = null;
//             if (not_eliminated_in_region2.length > 0) {
//                 // 对每个未被删掉的region2候选格，模拟eliminate_Candidates
//                 const elimination_sets2 = [];
//                 for (const [r2, c2] of not_eliminated_in_region2) {
//                     const board_copy2 = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
//                     board_copy2[r2][c2] = num;
//                     const eliminations2 = eliminate_Candidates(board_copy2, size, r2, c2, num);
//                     const eliminated_positions2 = eliminations2
//                         .filter(e => e.eliminated.includes(num))
//                         .map(e => `${e.row},${e.col}`);
//                     elimination_sets2.push(new Set(eliminated_positions2));
//                 }
//                 // 求交集
//                 region2_intersection = elimination_sets2[0];
//                 for (let j = 1; j < elimination_sets2.length; j++) {
//                     region2_intersection = new Set([...region2_intersection].filter(x => elimination_sets2[j].has(x)));
//                 }
//             } else {
//                 region2_intersection = new Set();
//             }
//             // 合并第一个区域模拟删数和第二个区域交集
//             const total_set = new Set([...eliminated_set, ...(region2_intersection ? [...region2_intersection] : [])]);
//             // 排除本身候选格
//             total_set.delete(`${region1_candidates[i][0]},${region1_candidates[i][1]}`);
//             region1_total_elimination_sets.push(total_set);
//         }

//         // 5. 求第一个区域每一个候选格的总删数记录找出他们的交集
//         let final_intersection = region1_total_elimination_sets[0];
//         for (let i = 1; i < region1_total_elimination_sets.length; i++) {
//             final_intersection = new Set([...final_intersection].filter(x => region1_total_elimination_sets[i].has(x)));
//         }
//         // 排除本身候选格
//         for (const [r, c] of region1_candidates) {
//             final_intersection.delete(`${r},${c}`);
//         }
//         for (const [r, c] of region2_candidates) {
//             final_intersection.delete(`${r},${c}`);
//         }
//         if (final_intersection.size === 0) continue;

//         // 真正执行删除
//         for (const pos of final_intersection) {
//             const [r, c] = pos.split(',').map(Number);
//             if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
//                 board[r][c] = board[r][c].filter(n => n !== num);
//                 changed = true;
//             }
//         }
//         if (changed) {
//             const block1_cells = region1_candidates.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
//             const block2_cells = region2_candidates.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
//             const eliminated_cells = [...final_intersection].map(pos => {
//                 const [r, c] = pos.split(',').map(Number);
//                 return `${getRowLetter(r+1)}${c+1}`;
//             }).join('、');
//             if (!state.silentMode) log_process(`[组合区块排除] 第${region1_index}${region1_type}(${block1_cells})与第${region2_index}${region2_type}(${block2_cells})的${num}组合区块，删除${eliminated_cells}的${num}`);
//             return true;
//         }
//     }
//     return false;
// }

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

        if (region1_rows.size <= 2 && region2_rows.size <= 2) {
            // 两个区域的候选格都在某两行
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
                                excluded_positions.push(`${getRowLetter(row + 1)}${col + 1}`);
                                changed = true;
                            }
                        }
                    }
                }
                if (changed) {
                    const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[组合区块排除] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在行${[...target_rows].map(r => getRowLetter(r + 1)).join('、')}，删除${excluded_positions.join('、')}的${num}`);
                    }
                    return true;
                }
            }
        }

        if (region1_cols.size <= 2 && region2_cols.size <= 2) {
            // 两个区域的候选格都在某两列
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
                                excluded_positions.push(`${getRowLetter(row + 1)}${col + 1}`);
                                changed = true;
                            }
                        }
                    }
                }
                if (changed) {
                    const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[组合区块排除] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在列${[...target_cols].map(c => c + 1).join('、')}，删除${excluded_positions.join('、')}的${num}`);
                    }
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * 宫组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @returns {boolean} 是否有变化
 */
function check_box_pair_block_elimination(board, size) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 遍历所有宫的组合（两两组合，不重复）
    const box_count_row = size / box_size[0];
    const box_count_col = size / box_size[1];
    const total_boxes = box_count_row * box_count_col;

    // 生成所有宫的格子坐标
    const all_boxes = [];
    for (let box_idx = 0; box_idx < total_boxes; box_idx++) {
        const box_row = Math.floor(box_idx / box_count_col);
        const box_col = box_idx % box_count_col;
        const region_cells = [];
        for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
            for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                region_cells.push([r, c]);
            }
        }
        all_boxes.push(region_cells);
    }

    // 两两组合
    for (let i = 0; i < total_boxes; i++) {
        for (let j = i + 1; j < total_boxes; j++) {
            if (region_pair_block_elimination(
                board,
                size,
                all_boxes[i],
                all_boxes[j],
                '宫',
                i + 1,
                '宫',
                j + 1
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
    // 枚举所有 subset_size 个格子的组合
    const combinations = getCombinations(candidates, subset_size);
    for (const combo of combinations) {
        // 合并所有候选数
        const union_nums = [...new Set(combo.flatMap(c => c.nums))];
        if (union_nums.length === subset_size) {
            // 只从本区域其他格子中排除这些数
            let affected_cells = [];
            for (const cell of candidates) {
                if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                    const original_length = cell.nums.length;
                    cell.nums = cell.nums.filter(n => !union_nums.includes(n));
                    board[cell.pos[0]][cell.pos[1]] = cell.nums;
                    if (cell.nums.length < original_length) {
                        affected_cells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                        changed = true;
                    }
                }
            }
            if (affected_cells.length > 0) {
                const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                const subset_cells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                if (!state.silentMode) log_process(`[${region_type}显性${subset_name}] 第${region_index}${region_type}的${subset_cells}构成${subset_name}${union_nums.join('')}，排除${affected_cells.join('、')}的${union_nums.join('、')}`);
                return true;
            }
        }
    }
    return false;
}

// 宫显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除宫内其他格的候选数，调用通用核心函数
function check_box_naked_subset_elimination(board, size, subset_size = 2) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
        for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
            // 计算宫的起始行列
            const region_cells = [];
            for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                    region_cells.push([r, c]);
                }
            }
            const box_num = box_row * (size / box_size[1]) + box_col + 1;
            if (region_naked_subset_elimination(board, size, region_cells, subset_size, '宫', box_num)) {
                return;
            }
        }
    }
    return has_conflict;
}

// 行列显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除本行/本列其他格的候选数，调用通用核心函数
function check_row_col_naked_subset_elimination(board, size, subset_size = 2) {
    let has_conflict = false;

    // 行显性数组
    for (let row = 0; row < size; row++) {
        const region_cells = [];
        for (let col = 0; col < size; col++) {
            region_cells.push([row, col]);
        }
        if (region_naked_subset_elimination(board, size, region_cells, subset_size, '行', row + 1)) {
            return;
        }
    }

    // 列显性数组
    for (let col = 0; col < size; col++) {
        const region_cells = [];
        for (let row = 0; row < size; row++) {
            region_cells.push([row, col]);
        }
        if (region_naked_subset_elimination(board, size, region_cells, subset_size, '列', col + 1)) {
            return;
        }
    }

    return has_conflict;
}

// 对角线显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// 只删除对角线内其他格的候选数，调用通用核心函数
function check_diagonal_naked_subset_elimination(board, size, subset_size = 2) {
    // 主对角线
    const main_diag_cells = [];
    for (let i = 0; i < size; i++) {
        main_diag_cells.push([i, i]);
    }
    if (region_naked_subset_elimination(board, size, main_diag_cells, subset_size, '对角线', 1)) {
        return;
    }

    // 副对角线
    const anti_diag_cells = [];
    for (let i = 0; i < size; i++) {
        anti_diag_cells.push([i, size - 1 - i]);
    }
    if (region_naked_subset_elimination(board, size, anti_diag_cells, subset_size, '对角线', 2)) {
        return;
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
    const num_combinations = getCombinations(nums, subset_size);

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
            // 检查这些格子是否都包含这些数字（可选，严格可不加）
            let is_subset = true;
            for (const [r, c] of positions) {
                if (!num_group.every(n => board[r][c].includes(n))) {
                    is_subset = false;
                    break;
                }
            }
            if (is_subset) {
                let modified = false;
                let deleted_cells = [];
                let deleted_nums = new Set();
                for (const [r, c] of positions) {
                    const before = board[r][c].length;
                    const deleted = board[r][c].filter(n => !num_group.includes(n));
                    board[r][c] = board[r][c].filter(n => num_group.includes(n));
                    if (board[r][c].length < before && deleted.length > 0) {
                        modified = true;
                        deleted_cells.push(`${getRowLetter(r+1)}${c+1}`);
                        deleted.forEach(n => deleted_nums.add(n));
                    }
                }
                if (modified) {
                    const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                    const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                    let detail_msg = deleted_cells.length > 0 ? `，删除${deleted_cells.join('、')}的${[...deleted_nums].join('、')}` : '';
                    if (!state.silentMode) {
                        log_process(`[${region_type}隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}${detail_msg}`);
                    }
                    return true;
                }
            }
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
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                // 计算宫的起始行列
                const region_cells = [];
                for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                    for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                        region_cells.push([r, c]);
                    }
                }
                const box_num = box_row * (size / box_size[1]) + box_col + 1;
                if (region_hidden_subset_elimination(board, size, region_cells, subset_size, '宫', box_num)) {
                    return;
                }
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
        // 行隐性数组
        for (let row = 0; row < size; row++) {
            const region_cells = [];
            for (let col = 0; col < size; col++) {
                region_cells.push([row, col]);
            }
            if (region_hidden_subset_elimination(board, size, region_cells, subset_size, '行', row + 1)) {
                return;
            }
        }
        // 列隐性数组
        for (let col = 0; col < size; col++) {
            const region_cells = [];
            for (let row = 0; row < size; row++) {
                region_cells.push([row, col]);
            }
            if (region_hidden_subset_elimination(board, size, region_cells, subset_size, '列', col + 1)) {
                return;
            }
        }
    }
    return has_conflict;
}

// 对角线隐性数对组
function check_diagonal_hidden_subset_elimination(board, size, subset_size = 2) {
    // 主对角线
    const main_diag_cells = [];
    for (let i = 0; i < size; i++) {
        main_diag_cells.push([i, i]);
    }
    if (region_hidden_subset_elimination(board, size, main_diag_cells, subset_size, '对角线', 1)) {
        return;
    }

    // 副对角线
    const anti_diag_cells = [];
    for (let i = 0; i < size; i++) {
        anti_diag_cells.push([i, size - 1 - i]);
    }
    if (region_hidden_subset_elimination(board, size, anti_diag_cells, subset_size, '对角线', 2)) {
        return;
    }

    return false;
}