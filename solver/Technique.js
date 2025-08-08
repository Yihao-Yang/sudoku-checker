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
    const techniqueCounts = {
        "唯余法": 0,
        "宫排除": 0,
        "行列排除": 0,
        "宫区块": 0,
        "行列区块": 0,
        "宫显性数对": 0,
        "行列显性数对": 0,
        "宫显性三数组": 0,
        "行列显性三数组": 0,
        "宫显性四数组": 0,
        "行列显性四数组": 0,
        "宫隐性数对": 0,
        "行列隐性数对": 0,
        "宫隐性三数组": 0,
        "行列隐性三数组": 0,
        "宫隐性四数组": 0,
        "行列隐性四数组": 0,
        "欠一排除": 0
    };

    let total_score = 0;
    // 技巧分值表
    const technique_scores = {
        // 唯余法分值细分，行列排除法分值细分
        "唯余法_1": 0,
        "唯余法_2": 1,
        "唯余法_3": 5,
        "唯余法_4": 50,
        "唯余法_5": 50,
        "唯余法_6": 80,
        "唯余法_7": 80,
        "唯余法_8": 100,
        "唯余法_9": 100,
        "行列排除_1": 0,
        "行列排除_2": 1,
        "行列排除_3": 5,
        "行列排除_4": 50,
        "行列排除_5": 50,
        "行列排除_6": 80,
        "行列排除_7": 80,
        "行列排除_8": 100,
        "行列排除_9": 100,
        // 其他技巧分值
        "宫排除": 2,
        "宫区块": 10,
        "宫隐性数对": 30,
        "行列区块": 40,
        "宫隐性三数组": 70,
        "宫显性数对": 80,
        "行列显性数对": 90,
        "行列隐性数对": 200,
        "宫显性三数组": 250,
        "行列显性三数组": 300,
        "宫隐性四数组": 350,
        "行列隐性三数组": 400,
        "宫显性四数组": 500,
        "行列显性四数组": 550,
        "行列隐性四数组": 600,

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
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 1)],
        // 第二优先级：余2数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 2)],
        // 第三优先级：宫排除法
        [() => state.techniqueSettings?.Box_Elimination && check_Box_Elimination(board, size)],
        // 第四优先级：余3数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 3)],
        // 第五优先级：行列排除法
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 1)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 2)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 3)],
        // [
        //     () => state.techniqueSettings?.Row_Elimination && check_Row_Elimination(board, size, size),
        //     () => state.techniqueSettings?.Col_Elimination && check_Col_Elimination(board, size, size)
        // ],

        
        
        

        // 第六优先级：宫区块
        [() => state.techniqueSettings?.Box_Block && check_Box_Block_Elimination(board, size)],
        // 第七优先级：行列区块（同一级）
        [() => state.techniqueSettings?.Row_Col_Block && check_Row_Col_Block_Elimination(board, size)],
        // [
        //     () => state.techniqueSettings?.Row_Block && check_Row_Block_Elimination(board, size),
        //     () => state.techniqueSettings?.Col_Block && check_Col_Block_Elimination(board, size)
        // ],
        // 第八优先级：余4，5数的唯余法，行列排除法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 4)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 5)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 4)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 5)],
        // 第九优先级：余6，7数的唯余法，行列排除法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 6)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 7)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 6)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 7)],
        // 第十优先级：余8，9数的唯余法，行列排除法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 8)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 9)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 8)],
        [() => state.techniqueSettings?.Row_Col_Elimination && check_Row_Col_Elimination(board, size, 9)],




        // 第十一优先级：宫隐性数对
        [() => state.techniqueSettings?.Box_Hidden_Pair && check_Box_Hidden_Subset_Elimination(board, size, 2)],
        // 第十二优先级：宫隐性三数组
        [() => state.techniqueSettings?.Box_Hidden_Triple && check_Box_Hidden_Subset_Elimination(board, size, 3)],
        // 第十三优先级：宫显性数对
        [() => state.techniqueSettings?.Box_Naked_Pair && check_Box_Naked_Subset_Elimination(board, size, 2)],
        // 第十四优先级：行列显性数对
        [() => (state.techniqueSettings?.Row_Col_Naked_Pair) && check_Row_Col_Naked_Subset_Elimination(board, size, 2)],
        // [
        //     () => state.techniqueSettings?.Row_Naked_Pair && check_Row_Naked_Subset_Elimination(board, size, 2),
        //     () => state.techniqueSettings?.Col_Naked_Pair && check_Col_Naked_Subset_Elimination(board, size, 2)
        // ],

        // 第十四点五优先级：宫隐性欠一数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 2)],//缺一门宫隐性欠一数对
        // 第十五优先级：行列隐性数对
        [() => (state.techniqueSettings?.Row_Col_Hidden_Pair) && check_Row_Col_Hidden_Subset_Elimination(board, size, 2)],
        // 第十六优先级：行列隐性三数组
        [() => (state.techniqueSettings?.Row_Col_Hidden_Triple) && check_Row_Col_Hidden_Subset_Elimination(board, size, 3)],
        // 第十六点五优先级：行列隐性欠一数对
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 2)],//缺一门行列隐性欠一数对
        // 第十七优先级：宫显性三数组
        [() => state.techniqueSettings?.Box_Naked_Triple && check_Box_Naked_Subset_Elimination(board, size, 3)],
        // 第十八优先级：行列显性三数组（同一级）
        [() => (state.techniqueSettings?.Row_Col_Naked_Triple) && check_Row_Col_Naked_Subset_Elimination(board, size, 3)],
        // [
        //     () => state.techniqueSettings?.Row_Naked_Triple && check_Row_Naked_Subset_Elimination(board, size, 3),
        //     () => state.techniqueSettings?.Col_Naked_Triple && check_Col_Naked_Subset_Elimination(board, size, 3)
        // ],
        // 第十八点五优先级：宫行列隐性欠一三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 3)],//缺一门宫隐性欠一三数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 3)],//缺一门行列隐性欠一三数组




        // 第十九优先级：宫隐性四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Box_Missing_One_Subset_Elimination(board, size, 4)],//缺一门宫隐性欠一四数组
        [() => state.techniqueSettings?.Box_Hidden_Quad && check_Box_Hidden_Subset_Elimination(board, size, 4)],
        // 第二十优先级：行列隐性四数组
        [() => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Col_Missing_One_Subset_Elimination(board, size, 4)],
        [() => (state.techniqueSettings?.Row_Col_Hidden_Quad) && check_Row_Col_Hidden_Subset_Elimination(board, size, 4)],
        // [
        //     () => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Row_Missing_One_Subset_Elimination(board, size, 4),//缺一门行隐性欠一四数组
        //     () => state.current_mode === 'missing' && state.techniqueSettings?.Missing_One && check_Col_Missing_One_Subset_Elimination(board, size, 4),//缺一门列隐性欠一四数组
        //     () => state.techniqueSettings?.Row_Hidden_Quad && check_Row_Hidden_Subset_Elimination(board, size, 4),
        //     () => state.techniqueSettings?.Col_Hidden_Quad && check_Col_Hidden_Subset_Elimination(board, size, 4)
        // ],
        // 第二十一优先级：宫显性四数组
        [() => state.techniqueSettings?.Box_Naked_Quad && check_Box_Naked_Subset_Elimination(board, size, 4)],
        // 第二十二优先级：行列显性四数组
        [() => (state.techniqueSettings?.Row_Col_Naked_Quad) && check_Row_Col_Naked_Subset_Elimination(board, size, 4)],
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
                        return { changed: false, hasEmptyCandidate: true, techniqueCounts };
                    }
                    if (!groupChanged && !isEqual(board, groupInitialBoard)) {
                        groupChanged = true;
                        // 根据技巧名称增加计数器和分值
                        const technique_name = technique.toString().match(/state\.techniqueSettings\?\.(\w+)/)?.[1];
                        let nat = technique.toString().match(/check_\w+\(([^,]+),\s*[^,]+,\s*(\d+)/)?.[2]; // 获取nat参数
                        if (technique_name) {
                            let chinese_name;
                            let score_key;
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
                                // case 'Row_Col_Elimination': chinese_name = "行列排除"; break;
                                case 'Box_Block':
                                    chinese_name = "宫区块";
                                    score_key = "宫区块";
                                    break;
                                case 'Row_Col_Block':
                                    chinese_name = "行列区块";
                                    score_key = "行列区块";
                                    break;
                                case 'Box_Naked_Pair':
                                    chinese_name = "宫显性数对";
                                    score_key = "宫显性数对";
                                    break;
                                case 'Row_Col_Naked_Pair':
                                    chinese_name = "行列显性数对";
                                    score_key = "行列显性数对";
                                    break;
                                case 'Box_Naked_Triple':
                                    chinese_name = "宫显性三数组";
                                    score_key = "宫显性三数组";
                                    break;
                                case 'Row_Col_Naked_Triple':
                                    chinese_name = "行列显性三数组";
                                    score_key = "行列显性三数组";
                                    break;
                                case 'Box_Naked_Quad':
                                    chinese_name = "宫显性四数组";
                                    score_key = "宫显性四数组";
                                    break;
                                case 'Row_Col_Naked_Quad':
                                    chinese_name = "行列显性四数组";
                                    score_key = "行列显性四数组";
                                    break;
                                case 'Box_Hidden_Pair':
                                    chinese_name = "宫隐性数对";
                                    score_key = "宫隐性数对";
                                    break;
                                case 'Row_Col_Hidden_Pair':
                                    chinese_name = "行列隐性数对";
                                    score_key = "行列隐性数对";
                                    break;
                                case 'Box_Hidden_Triple':
                                    chinese_name = "宫隐性三数组";
                                    score_key = "宫隐性三数组";
                                    break;
                                case 'Row_Col_Hidden_Triple':
                                    chinese_name = "行列隐性三数组";
                                    score_key = "行列隐性三数组";
                                    break;
                                case 'Box_Hidden_Quad':
                                    chinese_name = "宫隐性四数组";
                                    score_key = "宫隐性四数组";
                                    break;
                                case 'Row_Col_Hidden_Quad':
                                    chinese_name = "行列隐性四数组";
                                    score_key = "行列隐性四数组";
                                    break;
                                //
                                // case 'Missing_One': chinese_name = "欠一排除"; break;
                                default: chinese_name = null;
                            }
                            
                            if (chinese_name) {
                                techniqueCounts[chinese_name]++;
                                total_score += technique_scores[score_key] || 0;
                            }
                        // // 根据技巧名称增加计数器
                        // const techniqueName = technique.toString().match(/state\.techniqueSettings\?\.(\w+)/)?.[1];
                        // if (techniqueName) {
                        //     let chineseName;
                        //     // 映射英文名到中文名
                        //     switch(techniqueName) {
                        //         case 'Cell_Elimination': chineseName = "唯余法"; break;
                        //         case 'Box_Elimination': chineseName = "宫排除"; break;
                        //         case 'Row_Col_Elimination': chineseName = "行列排除"; break;
                        //         case 'Box_Block': chineseName = "宫区块"; break;
                        //         case 'Row_Col_Block': chineseName = "行列区块"; break;
                        //         case 'Box_Naked_Pair': chineseName = "宫显性数对"; break;
                        //         case 'Row_Col_Naked_Pair': chineseName = "行列显性数对"; break;
                        //         case 'Box_Naked_Triple': chineseName = "宫显性三数组"; break;
                        //         case 'Row_Col_Naked_Triple': chineseName = "行列显性三数组"; break;
                        //         case 'Box_Naked_Quad': chineseName = "宫显性四数组"; break;
                        //         case 'Row_Col_Naked_Quad': chineseName = "行列显性四数组"; break;
                        //         case 'Box_Hidden_Pair': chineseName = "宫隐性数对"; break;
                        //         case 'Row_Col_Hidden_Pair': chineseName = "行列隐性数对"; break;
                        //         case 'Box_Hidden_Triple': chineseName = "宫隐性三数组"; break;
                        //         case 'Row_Col_Hidden_Triple': chineseName = "行列隐性三数组"; break;
                        //         case 'Box_Hidden_Quad': chineseName = "宫隐性四数组"; break;
                        //         case 'Row_Col_Hidden_Quad': chineseName = "行列隐性四数组"; break;
                        //         case 'Missing_One': chineseName = "欠一排除"; break; // 缺一门专用
                        //         default: chineseName = null;
                        //     }
                            
                        //     if (chineseName) {
                        //         techniqueCounts[chineseName]++;
                        //     }
                        }
                        // const techniqueName = technique.toString().match(/state\.techniqueSettings\?\.(\w+)/)?.[1];
                        // if (techniqueName && techniqueCounts.hasOwnProperty(techniqueName)) {
                        //     techniqueCounts[techniqueName]++;
                        // }
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

    return { changed, hasEmptyCandidate: false, techniqueCounts, total_score };
}
// // 宫排除
// function check_Box_Elimination(board, size) {
//     // 宫的大小定义（兼容6宫格）
//     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
//     let hasConflict = false;
    
//     // 如果是缺一门数独模式，执行特殊排除逻辑
//     if (state.current_mode === 'missing') {
//     for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
//       for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
//         const startRow = boxRow * boxSize[0];
//         const startCol = boxCol * boxSize[1];
//         const numPositions = {};
//         // let missingNum = null;
//         // let missingCount = 0;
//         const missingNums = [];
//         const existingNums = new Set();

//         // 先收集宫中已存在的数字
//         for (let r = startRow; r < startRow + boxSize[0]; r++) {
//           for (let c = startCol; c < startCol + boxSize[1]; c++) {
//             if (typeof board[r][c] === 'number' && board[r][c] !== -1) {
//               existingNums.add(board[r][c]);
//             }
//           }
//         }

//         // 统计数字在宫中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//           if (existingNums.has(num)) continue; // 跳过已存在的数字
//           numPositions[num] = [];
//           for (let r = startRow; r < startRow + boxSize[0]; r++) {
//             for (let c = startCol; c < startCol + boxSize[1]; c++) {
//               if (board[r][c] === -1) continue; // 跳过黑格
//               if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
//                 numPositions[num].push([r, c]);
//               }
//             }
//           }
//           // 记录没有可填位置的数字
//           if (numPositions[num].length === 0) {
//             // missingNum = num;
//             // missingCount++;
//             missingNums.push(num);
//           }
//         }
        

//         // 如果满足条件（有缺失数字）
//         if (missingNums.length === 1) {
//             // 对其他数字执行宫排除
//             for (let num = 1; num <= size; num++) {
//                 // log_process(`当前检查数字 ${num}`);
//                 if (missingNums.includes(num)) continue;
//                 if (!numPositions[num]) continue;
//                 if (numPositions[num].length === 1) {
//                     const [row, col] = numPositions[num][0];
//                     board[row][col] = num;
//                     if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
//                     eliminate_Candidates(board, size, row, col, num);
//                     return;
//                 }
//             }
//         }

//             // // 检查是否有两个数字只有一个可填位置且位置相同
//             //     const singlePositionNums = [];
//             //     const skipNums = new Set(); // 新增：用于记录需要跳过的数字
//             //     for (let num = 1; num <= size; num++) {
//             //         if (missingNums.includes(num)) continue;
//             //         if (numPositions[num] && numPositions[num].length === 1) {
//             //             singlePositionNums.push(num);
//             //         }
//             //     }

//             //     // 检查这些数字是否都指向同一个格子
//             //     const positionMap = new Map();
//             //     for (const num of singlePositionNums) {
//             //         const posKey = numPositions[num][0].join(',');
//             //         if (!positionMap.has(posKey)) {
//             //             positionMap.set(posKey, []);
//             //         }
//             //         positionMap.get(posKey).push(num);
//             //     }

//             //     // 处理共享同一格子的多个数字
//             //     for (const [posKey, nums] of positionMap.entries()) {
//             //         const [row, col] = posKey.split(',').map(Number);
                    
//             //         // 如果多个数字只能填同一格，则将该格限制为这些数字
//             //         if (nums.length > 1) {
//             //             const currentCandidates = board[row][col];
//             //             const newCandidates = currentCandidates.filter(n => nums.includes(n));
                        
//             //             if (newCandidates.length < currentCandidates.length) {
//             //                 board[row][col] = newCandidates;
//             //                 if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}限制为候选数${nums.join(',')}`);
//             //                 nums.forEach(n => skipNums.add(n)); // 新增：将这些数字加入跳过集合
//             //                 if (!state.silentMode) log_process(`[跳过数字] 已标记跳过数字: ${nums.join(',')}`);
      
//             //                 return;
//             //             }
//             //         }
//             //     }
//             //     // 对其他数字执行宫排除
//             //     for (let num = 1; num <= size; num++) {
//             //         log_process(`当前检查数字 ${num}`);
//             //         if (missingNums.includes(num)) continue;
//             //         // if (missingNums.includes(num) || board.flat().some(cell => cell === num)) continue;
  
//             //         if (skipNums.has(num)) continue;
//             //         // log_process(`当前检查数字 ${num}`);
//             //         if (!numPositions[num]) continue;
//             //         if (numPositions[num].length === 1) {
//             //             const [row, col] = numPositions[num][0];
//             //             board[row][col] = num;
//             //             if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
//             //             eliminate_Candidates(board, size, row, col, num);
//             //             return;
//             //         }
//             //     }


//       }
//     }
//     return hasConflict;
  

//     }
//     else {
//         // 遍历每个宫
//         for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
//             for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
//                 // 统计每个数字在该宫出现的候选格位置
//                 const numPositions = {};

//                 // 计算宫的起始行列
//                 const startRow = boxRow * boxSize[0];
//                 const startCol = boxCol * boxSize[1];

//                 // 先检查宫中是否已有确定数字
//                 const existingNums = new Set();
//                 for (let r = startRow; r < startRow + boxSize[0]; r++) {
//                     for (let c = startCol; c < startCol + boxSize[1]; c++) {
//                         if (typeof board[r][c] === 'number') {
//                             existingNums.add(board[r][c]);
//                         }
//                     }
//                 }

//                 for (let num = 1; num <= size; num++) {
//                     numPositions[num] = [];
//                     // 如果数字已存在，跳过统计
//                     if (existingNums.has(num)) continue;

//                     for (let r = startRow; r < startRow + boxSize[0]; r++) {
//                         for (let c = startCol; c < startCol + boxSize[1]; c++) {
//                             const cell = board[r][c];
//                             if (Array.isArray(cell) && cell.includes(num)) {
//                                 numPositions[num].push([r, c]);
//                             }
//                         }
//                     }

//                     if (numPositions[num].length === 1) {
//                         const [row, col] = numPositions[num][0];
//                         const cell = board[row][col];
//                         if (Array.isArray(cell) && cell.includes(num)) {
//                             board[row][col] = num;
//                             if (!state.silentMode) log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
//                             eliminate_Candidates(board, size, row, col, num);
//                             return;
//                         }
//                     } else if (numPositions[num].length === 0) {
//                         hasConflict = true; // 直接标记冲突
//                         const boxNum = boxRow * (size / boxSize[1]) + boxCol + 1;
//                         if (!state.silentMode) log_process(`[冲突] ${boxNum}宫中数字${num}无可填入位置，无解`);
//                         // if (!state.silentMode) log_process(`[冲突] ${boxRow*3+boxCol+1}宫中数字${num}无可填入位置，无解`);
//                         return true;
//                     }
//                 }
//             }
//         }
//     }
    
// }

// 宫排除
function check_Box_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
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
                            eliminate_Candidates(board, size, row, col, num);
                            return;
                        }
                    }
                }
            }
        }
        return has_conflict;
    } else {
        // 遍历每个宫
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

                for (let num = 1; num <= size; num++) {
                    num_positions[num] = [];
                    // 如果数字已存在，跳过统计
                    if (existing_nums.has(num)) continue;

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
                }
            }
        }
    }
    return has_conflict;
}


// 欠一宫排除（专用于缺一门数独）
function check_Box_Missing_One_Subset_Elimination(board, size, nat = 2) {
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

// 行列排除（合并函数）
function check_Row_Col_Elimination(board, size, nat) {    
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
        // 正常数独模式下的原有逻辑
        // 行排除
        for (let row = 0; row < size; row++) {
            const num_positions = {};
            const existing_nums = new Set();
            
            for (let col = 0; col < size; col++) {
                if (typeof board[row][col] === 'number') {
                    existing_nums.add(board[row][col]);
                }
            }

            for (let num = 1; num <= size; num++) {
                num_positions[num] = [];
                if (existing_nums.has(num)) continue;

                for (let col = 0; col < size; col++) {
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        num_positions[num].push(col);
                    }
                }

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

        // 列排除
        for (let col = 0; col < size; col++) {
            const num_positions = {};
            const existing_nums = new Set();
            
            for (let row = 0; row < size; row++) {
                if (typeof board[row][col] === 'number') {
                    existing_nums.add(board[row][col]);
                }
            }

            for (let num = 1; num <= size; num++) {
                num_positions[num] = [];
                if (existing_nums.has(num)) continue;

                for (let row = 0; row < size; row++) {
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        num_positions[num].push(row);
                    }
                }

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

// // // 行排除 
// // function check_Row_Elimination(board, size, nat) {    
// //     let has_conflict = false;
    
// //     // 如果是缺一门数独模式，执行特殊排除逻辑
// //     if (state.current_mode === 'missing') {
// //         for (let row = 0; row < size; row++) {
// //             // 统计每个数字在该行出现的候选格位置
// //             const num_positions = {};
// //             const missing_nums = [];
// //             const existing_nums = new Set();

// //             // 1. 先收集行中已存在的数字
// //             for (let col = 0; col < size; col++) {
// //                 if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
// //                     existing_nums.add(board[row][col]);
// //                 }
// //             }

// //             // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
// //             for (let num = 1; num <= size; num++) {
// //                 if (existing_nums.has(num)) continue; // 跳过已存在的数字
// //                 num_positions[num] = [];
                
// //                 for (let col = 0; col < size; col++) {
// //                     if (board[row][col] === -1) continue; // 跳过黑格
// //                     if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
// //                         num_positions[num].push(col);
// //                     }
// //                 }
                
// //                 // 记录没有可填位置的数字
// //                 if (num_positions[num].length === 0) {
// //                     missing_nums.push(num);
// //                 }
// //             }

// //             // 3. 检查是否有欠一数对组标记
// //             const subset_info = state.row_missing_subsets[`row_${row}`];

// //             // 4. 如果满足条件（有缺失数字或已有数对组标记）
// //             if (missing_nums.length === 1 || subset_info) {
// //                 // 对其他数字执行行排除
// //                 for (let num = 1; num <= size; num++) {
// //                     if (missing_nums.includes(num)) continue;
// //                     // 如果有欠一数对组标记，跳过标记中的数字
// //                     if (subset_info && subset_info.nums.includes(num)) continue;
// //                     if (!num_positions[num]) continue;
                    
// //                     if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
// //                         const col = num_positions[num][0];
// //                         const cell = board[row][col];
// //                         if (Array.isArray(cell) && cell.includes(num)) {
// //                             board[row][col] = num;
// //                             if (!state.silentMode) log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
// //                             eliminate_Candidates(board, size, row, col, num);
// //                             return;
// //                         }
// //                     } else if (num_positions[num].length === 0) {
// //                         has_conflict = true;
// //                         if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
// //                         return true;
// //                     }
// //                 }
// //             }
// //         }
// //         return has_conflict;
// //     } else {
// //         // 正常数独模式下的原有逻辑
// //         for (let row = 0; row < size; row++) {
// //             // 统计每个数字在该行出现的候选格位置
// //             const num_positions = {};
// //             // 先检查行中是否已有确定数字
// //             const existing_nums = new Set();
// //             for (let col = 0; col < size; col++) {
// //                 if (typeof board[row][col] === 'number') {
// //                     existing_nums.add(board[row][col]);
// //                 }
// //             }

// //             for (let num = 1; num <= size; num++) {
// //                 num_positions[num] = [];
// //                 // 如果数字已存在，跳过统计
// //                 if (existing_nums.has(num)) continue;

// //                 for (let col = 0; col < size; col++) {
// //                     const cell = board[row][col];
// //                     if (Array.isArray(cell) && cell.includes(num)) {
// //                         num_positions[num].push(col);
// //                     }
// //                 }

// //                 if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
// //                     const col = num_positions[num][0];
// //                     const cell = board[row][col];
// //                     if (Array.isArray(cell) && cell.includes(num)) {
// //                         board[row][col] = num;
// //                         if (!state.silentMode) log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
// //                         eliminate_Candidates(board, size, row, col, num);
// //                         return;
// //                     }
// //                 } else if (num_positions[num].length === 0) {
// //                     has_conflict = true;
// //                     if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
// //                     return true;
// //                 }
// //             }
// //         }
// //     }
// //     return has_conflict;
// // }

// // 欠一行排除（专用于缺一门数独）
// function check_Row_Missing_One_Subset_Elimination(board, size, nat = 2) {
//     // 仅缺一门数独模式有效
//     if (state.current_mode !== 'missing') return false;
    
//     let has_conflict = false;
    
//     // 遍历每一行
//     for (let row = 0; row < size; row++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 先收集行中已存在的数字
//         for (let col = 0; col < size; col++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let col = 0; col < size; col++) {
//                 if (board[row][col] === -1) continue; // 跳过黑格
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(col);
//                 }
//             }
            
//             // 记录没有可填位置的数字
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查是否有欠一数对组标记
//         const subset_info = state.row_missing_subsets[`row_${row}`];

//         // 4. 通用逻辑：检测 (nat) 个数字只能填在 (nat-1) 个格子的情况
//         if (nat >= 2 && nat <= 4) {
//             // 生成所有可能的数字组合（过滤掉已存在和缺失的数字）
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, nat);

//             for (const nums of num_combinations) {
//                 // 统计这些数字出现的格子
//                 const positions = new Set();
//                 for (const num of nums) {
//                     if (num_positions[num]) {
//                         for (const col of num_positions[num]) {
//                             positions.add(col);
//                         }
//                     }
//                 }

//                 // 检查是否满足条件：数字只能填在 (nat-1) 个格子中
//                 if (positions.size === nat - 1) {
//                     const pos_array = Array.from(positions).map(col => col);
                    
//                     // 检查这些格子是否都包含至少两个目标数字
//                     let is_valid = true;
//                     for (const col of pos_array) {
//                         const cell = board[row][col];
//                         const count = nums.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         // 从这些格子中删除其他数字
//                         for (const col of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => nums.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const cells = pos_array.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
//                             const subset_name = nat === 2 ? '数对' : nat === 3 ? '三数组' : '四数组';
//                             if (!state.silentMode) {
//                                 log_process(`[欠一行排除] ${cells}构成隐性${subset_name}${nums.join('')}，删除其他候选数`);
//                             }

//                             // 记录欠一数对组信息
//                             state.row_missing_subsets[`row_${row}`] = {
//                                 nums: nums,
//                                 positions: pos_array.map(col => `${row},${col}`)
//                             };
//                             return; // 每次只处理一个发现
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return has_conflict;
// }

// // // 列排除
// // function check_Col_Elimination(board, size, nat) {
// //     let has_conflict = false;
    
// //     // 如果是缺一门数独模式，执行特殊排除逻辑
// //     if (state.current_mode === 'missing') {
// //         for (let col = 0; col < size; col++) {
// //             // 统计每个数字在该列出现的候选格位置
// //             const num_positions = {};
// //             const missing_nums = [];
// //             const existing_nums = new Set();

// //             // 1. 先收集列中已存在的数字
// //             for (let row = 0; row < size; row++) {
// //                 if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
// //                     existing_nums.add(board[row][col]);
// //                 }
// //             }

// //             // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
// //             for (let num = 1; num <= size; num++) {
// //                 if (existing_nums.has(num)) continue; // 跳过已存在的数字
// //                 num_positions[num] = [];
                
// //                 for (let row = 0; row < size; row++) {
// //                     if (board[row][col] === -1) continue; // 跳过黑格
// //                     if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
// //                         num_positions[num].push(row);
// //                     }
// //                 }
                
// //                 // 记录没有可填位置的数字
// //                 if (num_positions[num].length === 0) {
// //                     missing_nums.push(num);
// //                 }
// //             }

// //             // 3. 检查是否有欠一数对组标记
// //             const subset_info = state.col_missing_subsets[`col_${col}`];

// //             // 4. 如果满足条件（有缺失数字或已有数对组标记）
// //             if (missing_nums.length === 1 || subset_info) {
// //                 // 对其他数字执行列排除
// //                 for (let num = 1; num <= size; num++) {
// //                     if (missing_nums.includes(num)) continue;
// //                     // 如果有欠一数对组标记，跳过标记中的数字
// //                     if (subset_info && subset_info.nums.includes(num)) continue;
// //                     if (!num_positions[num]) continue;
                    
// //                     if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
// //                         const row = num_positions[num][0];
// //                         const cell = board[row][col];
// //                         if (Array.isArray(cell) && cell.includes(num)) {
// //                             board[row][col] = num;
// //                             if (!state.silentMode) log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
// //                             eliminate_Candidates(board, size, row, col, num);
// //                             return;
// //                         }
// //                     } else if (num_positions[num].length === 0) {
// //                         has_conflict = true;
// //                         if (!state.silentMode) log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
// //                         return true;
// //                     }
// //                 }
// //             }
// //         }
// //         return has_conflict;
// //     } else {
// //         // 正常数独模式下的原有逻辑
// //         for (let col = 0; col < size; col++) {
// //             // 统计每个数字在该列出现的候选格位置
// //             const num_positions = {};
// //             // 先检查列中是否已有确定数字
// //             const existing_nums = new Set();
// //             for (let row = 0; row < size; row++) {
// //                 if (typeof board[row][col] === 'number') {
// //                     existing_nums.add(board[row][col]);
// //                 }
// //             }

// //             for (let num = 1; num <= size; num++) {
// //                 num_positions[num] = [];
// //                 // 如果数字已存在，跳过统计
// //                 if (existing_nums.has(num)) continue;

// //                 for (let row = 0; row < size; row++) {
// //                     const cell = board[row][col];
// //                     if (Array.isArray(cell) && cell.includes(num)) {
// //                         num_positions[num].push(row);
// //                     }
// //                 }

// //                 if (existing_nums.size >= size - nat && num_positions[num].length === 1) {
// //                     const row = num_positions[num][0];
// //                     const cell = board[row][col];
// //                     if (Array.isArray(cell) && cell.includes(num)) {
// //                         board[row][col] = num;
// //                         if (!state.silentMode) log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
// //                         eliminate_Candidates(board, size, row, col, num);
// //                         return;
// //                     }
// //                 } else if (num_positions[num].length === 0) {
// //                     has_conflict = true;
// //                     if (!state.silentMode) log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
// //                     return true;
// //                 }
// //             }
// //         }
// //     }
// //     return has_conflict;
// // }

// // 欠一列排除（专用于缺一门数独）
// function check_Col_Missing_One_Subset_Elimination(board, size, nat = 2) {
//     // 仅缺一门数独模式有效
//     if (state.current_mode !== 'missing') return false;
    
//     let has_conflict = false;
    
//     // 遍历每一列
//     for (let col = 0; col < size; col++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 先收集列中已存在的数字
//         for (let row = 0; row < size; row++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let row = 0; row < size; row++) {
//                 if (board[row][col] === -1) continue; // 跳过黑格
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(row);
//                 }
//             }
            
//             // 记录没有可填位置的数字
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查是否有欠一数对组标记
//         const subset_info = state.col_missing_subsets[`col_${col}`];

//         // 4. 通用逻辑：检测 (nat) 个数字只能填在 (nat-1) 个格子的情况
//         if (nat >= 2 && nat <= 4) {
//             // 生成所有可能的数字组合（过滤掉已存在和缺失的数字）
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, nat);

//             for (const nums of num_combinations) {
//                 // 统计这些数字出现的格子
//                 const positions = new Set();
//                 for (const num of nums) {
//                     if (num_positions[num]) {
//                         for (const row of num_positions[num]) {
//                             positions.add(row);
//                         }
//                     }
//                 }

//                 // 检查是否满足条件：数字只能填在 (nat-1) 个格子中
//                 if (positions.size === nat - 1) {
//                     const pos_array = Array.from(positions).map(row => row);
                    
//                     // 检查这些格子是否都包含至少两个目标数字
//                     let is_valid = true;
//                     for (const row of pos_array) {
//                         const cell = board[row][col];
//                         const count = nums.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         // 从这些格子中删除其他数字
//                         for (const row of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => nums.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const cells = pos_array.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
//                             const subset_name = nat === 2 ? '数对' : nat === 3 ? '三数组' : '四数组';
//                             if (!state.silentMode) {
//                                 log_process(`[欠一列排除] ${cells}构成隐性${subset_name}${nums.join('')}，删除其他候选数`);
//                             }

//                             // 记录欠一数对组信息
//                             state.col_missing_subsets[`col_${col}`] = {
//                                 nums: nums,
//                                 positions: pos_array.map(row => `${row},${col}`)
//                             };
//                             return; // 每次只处理一个发现
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return has_conflict;
// }

// 检查格唯一候选数（唯一余数法）
function check_Cell_Elimination(board, size, nat = 1) {
    let hasConflict = false;
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            
            if (Array.isArray(cell)) {
                // 先检查冲突情况
                if (cell.length === 0) {
                    hasConflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                
                // 检查单一候选数情况
                if (cell.length === 1) {
                    const num = cell[0];
                    
                    // 检查当前宫是否已填size-1个数字
                    const boxRow = Math.floor(row / boxSize[0]);
                    const boxCol = Math.floor(col / boxSize[1]);
                    const startRow = boxRow * boxSize[0];
                    const startCol = boxCol * boxSize[1];
                    const boxNums = new Set();
                    
                    for (let r = startRow; r < startRow + boxSize[0]; r++) {
                        for (let c = startCol; c < startCol + boxSize[1]; c++) {
                            if (typeof board[r][c] === 'number') {
                                boxNums.add(board[r][c]);
                            }
                        }
                    }

                    if (boxNums.size === size - nat && !boxNums.has(num)) {
                        board[row][col] = num;
                        if (!state.silentMode) log_process(`[唯余法] ${getRowLetter(row+1)}${col+1}=${num}（宫内余${nat}数）`);
                        eliminate_Candidates(board, size, row, col, num);
                        return;
                        continue; // 处理完后直接进入下一个格子
                    }
                    
                    // 检查当前行是否已填size-1个数字
                    const rowNums = new Set();
                    for (let c = 0; c < size; c++) {
                        if (typeof board[row][c] === 'number') {
                            rowNums.add(board[row][c]);
                        }
                    }
                    
                    // 检查当前列是否已填size-1个数字
                    const colNums = new Set();
                    for (let r = 0; r < size; r++) {
                        if (typeof board[r][col] === 'number') {
                            colNums.add(board[r][col]);
                        }
                    }
                    
                    // 如果宫/行/列中已填size-1个数字，且当前数字是缺失的那个
                    if (rowNums.size === size - nat && !rowNums.has(num) ||
                        colNums.size === size - nat && !colNums.has(num)) {
                        
                        board[row][col] = num;
                        if (!state.silentMode) log_process(`[唯余法] ${getRowLetter(row+1)}${col+1}=${num}（行/列余${nat}数）`);
                        eliminate_Candidates(board, size, row, col, num);
                        return;
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查宫区块排除
function check_Box_Block_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
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
        // 遍历每个宫
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

                for (let num = 1; num <= size; num++) {
                    num_positions[num] = [];
                    // 如果数字已存在，跳过统计
                    if (existing_nums.has(num)) continue;
                    
                    for (let r = start_row; r < start_row + box_size[0]; r++) {
                        for (let c = start_col; c < start_col + box_size[1]; c++) {
                            const cell = board[r][c];
                            if (Array.isArray(cell) && cell.includes(num)) {
                                num_positions[num].push([r, c]);
                            }
                        }
                    }

                    // 区块排除法逻辑
                    if (num_positions[num].length > 1) {
                        // 检查是否全部在同一行
                        const all_same_row = num_positions[num].every(([r, _]) => r === num_positions[num][0][0]);
                        // 检查是否全部在同一列
                        const all_same_col = num_positions[num].every(([_, c]) => c === num_positions[num][0][1]);

                        // 对角线模式：检查是否在同一条对角线上
                        let all_same_diagonal = false;
                        if (state.current_mode === 'diagonal') {
                            const is_main_diagonal = num_positions[num].every(([r, c]) => r === c);
                            const is_anti_diagonal = num_positions[num].every(([r, c]) => r + c === size - 1);
                            all_same_diagonal = is_main_diagonal || is_anti_diagonal;
                        }

                        // 新增：对角线数独的特殊区块逻辑
                        if (state.current_mode === 'diagonal' && !all_same_diagonal) {
                            // 检查数字是否既有在对角线上又有不在对角线上
                            const has_diagonal = num_positions[num].some(([r, c]) => r === c || r + c === size - 1);
                            const has_non_diagonal = num_positions[num].some(([r, c]) => r !== c && r + c !== size - 1);

                            if (has_diagonal && has_non_diagonal) {
                                // 检查不在对角线上的数字是否在同一行
                                const non_diagonal_positions = num_positions[num].filter(([r, c]) => r !== c && r + c !== size - 1);
                                const all_same_row_non_diagonal = non_diagonal_positions.every(([r, _]) => r === non_diagonal_positions[0][0]);
                                const all_same_col_non_diagonal = non_diagonal_positions.every(([_, c]) => c === non_diagonal_positions[0][1]);


                                if (all_same_row_non_diagonal) {
                                    const target_row = non_diagonal_positions[0][0];
                                    // 检查在对角线上的数字是否在同一条对角线上
                                    const diagonal_positions = num_positions[num].filter(([r, c]) => r === c || r + c === size - 1);
                                    const is_main_diagonal = diagonal_positions.every(([r, c]) => r === c);
                                    const is_anti_diagonal = diagonal_positions.every(([r, c]) => r + c === size - 1);

                                    if (is_main_diagonal || is_anti_diagonal) {
                                        // 找到该行和该对角线重叠的格子
                                        const overlapping_cells = [];
                                        for (let c = 0; c < size; c++) {
                                            const r = target_row;
                                            if (is_main_diagonal && r === c) {
                                                overlapping_cells.push([r, c]);
                                            } else if (is_anti_diagonal && r + c === size - 1) {
                                                overlapping_cells.push([r, c]);
                                            }
                                        }

                                        // 检查这些格子是否不在本宫中
                                        let excluded_cells = [];
                                        for (const [r, c] of overlapping_cells) {
                                            const is_in_box = (r >= start_row && r < start_row + box_size[0] && c >= start_col && c < start_col + box_size[1]);
                                            if (!is_in_box) {
                                                const cell = board[r][c];
                                                if (Array.isArray(cell) && cell.includes(num)) {
                                                    board[r][c] = cell.filter(n => n !== num);
                                                    excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                                }
                                            }
                                        }

                                        if (excluded_cells.length > 0) {
                                            const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                            if (!state.silentMode) {
                                                log_process(`[特殊对角线宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                            }
                                            return;
                                        }
                                    }
                                }

                                if (all_same_col_non_diagonal) {
                                    const target_col = non_diagonal_positions[0][1];
                                    // 检查在对角线上的数字是否在同一条对角线上
                                    const diagonal_positions = num_positions[num].filter(([r, c]) => r === c || r + c === size - 1);
                                    const is_main_diagonal = diagonal_positions.every(([r, c]) => r === c);
                                    const is_anti_diagonal = diagonal_positions.every(([r, c]) => r + c === size - 1);

                                    if (is_main_diagonal || is_anti_diagonal) {
                                        // 找到该列和该对角线重叠的格子
                                        const overlapping_cells = [];
                                        for (let r = 0; r < size; r++) {
                                            const c = target_col;
                                            if (is_main_diagonal && r === c) {
                                                overlapping_cells.push([r, c]);
                                            } else if (is_anti_diagonal && r + c === size - 1) {
                                                overlapping_cells.push([r, c]);
                                            }
                                        }

                                        // 检查这些格子是否不在本宫中
                                        let excluded_cells = [];
                                        for (const [r, c] of overlapping_cells) {
                                            const is_in_box = (r >= start_row && r < start_row + box_size[0] && c >= start_col && c < start_col + box_size[1]);
                                            if (!is_in_box) {
                                                const cell = board[r][c];
                                                if (Array.isArray(cell) && cell.includes(num)) {
                                                    board[r][c] = cell.filter(n => n !== num);
                                                    excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                                }
                                            }
                                        }

                                        if (excluded_cells.length > 0) {
                                            const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                            if (!state.silentMode) {
                                                log_process(`[特殊对角线宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                            }
                                            return;
                                        }
                                    }
                                }
                            }
                        }

                        // 多斜线模式：检查是否在同一条手动画的斜线上
                        let all_same_multi_diagonal = false;
                        let line_cells = [];
                        if (state.current_mode === 'multi_diagonal') {
                            const mark_lines = get_all_mark_lines(); // 获取所有手动画的斜线
                            for (const [start, end] of mark_lines) {
                                const cells = get_cells_on_line(size, start, end); // 获取斜线上的所有格子
                                // 检查当前数字的所有候选格是否都在同一条斜线上
                                if (num_positions[num].every(([r, c]) => cells.some(([cr, cc]) => cr === r && cc === c))) {
                                    all_same_multi_diagonal = true;
                                    line_cells = cells;
                                    break;
                                }
                            }
                        }

                        // 新增：斜线数独的特殊区块逻辑
                        if (state.current_mode === 'multi_diagonal') {
                            // 检查数字是否既有在斜线上又有不在斜线上
                            const mark_lines = get_all_mark_lines();
                            for (const [start, end] of mark_lines) {
                                const line_cells = get_cells_on_line(size, start, end);
                                const is_on_line = pos => line_cells.some(([r, c]) => r === pos[0] && c === pos[1]);
                                const has_line = num_positions[num].some(is_on_line);
                                const has_non_line = num_positions[num].some(pos => !is_on_line(pos));
                                if (has_line && has_non_line) {
                                    // 检查不在斜线上的数字是否在同一行或同一列
                                    const non_line_positions = num_positions[num].filter(pos => !is_on_line(pos));
                                    const all_same_row_non_line = non_line_positions.every(([r, _]) => r === non_line_positions[0][0]);
                                    const all_same_col_non_line = non_line_positions.every(([_, c]) => c === non_line_positions[0][1]);
                                    if (all_same_row_non_line || all_same_col_non_line) {
                                        // 检查在斜线上的数字是否都在同一条斜线上
                                        const line_positions = num_positions[num].filter(is_on_line);
                                        const all_on_this_line = line_positions.length > 0 && line_positions.every(is_on_line);
                                        if (all_on_this_line) {
                                            // 找到该行/列和该斜线重叠的格子
                                            let overlapping_cells = [];
                                            if (all_same_row_non_line) {
                                                const r = non_line_positions[0][0];
                                                for (let c = 0; c < size; c++) {
                                                    if (is_on_line([r, c])) {
                                                        overlapping_cells.push([r, c]);
                                                    }
                                                }
                                            } else if (all_same_col_non_line) {
                                                const c = non_line_positions[0][1];
                                                for (let r = 0; r < size; r++) {
                                                    if (is_on_line([r, c])) {
                                                        overlapping_cells.push([r, c]);
                                                    }
                                                }
                                            }
                                            // 检查这些格子是否不在本宫中
                                            let excluded_cells = [];
                                            for (const [r, c] of overlapping_cells) {
                                                const is_in_box = (r >= start_row && r < start_row + box_size[0] && c >= start_col && c < start_col + box_size[1]);
                                                if (!is_in_box) {
                                                    const cell = board[r][c];
                                                    if (Array.isArray(cell) && cell.includes(num)) {
                                                        board[r][c] = cell.filter(n => n !== num);
                                                        excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                                    }
                                                }
                                            }
                                            if (excluded_cells.length > 0) {
                                                const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                                if (!state.silentMode) {
                                                    log_process(`[特殊斜线宫区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                                }
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 宫区块行排除逻辑
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

                        // 宫区块列排除逻辑
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

                        // 宫区块对角线排除逻辑
                        if (all_same_diagonal) {
                            let excluded_cells = [];
                            // 判断当前数字是在主对角线还是副对角线
                            const is_main_diagonal = num_positions[num].every(([r, c]) => r === c);
                            const is_anti_diagonal = num_positions[num].every(([r, c]) => r + c === size - 1);
                            for (let r = 0; r < size; r++) {
                                for (let c = 0; c < size; c++) {
                                    // 只排除当前数字所在的那条对角线
                                    let is_in_diagonal = false;
                                    if (is_main_diagonal) {
                                        is_in_diagonal = (r === c);
                                    } else if (is_anti_diagonal) {
                                        is_in_diagonal = (r + c === size - 1);
                                    }
                                    const is_in_box = (r >= start_row && r < start_row + box_size[0] && c >= start_col && c < start_col + box_size[1]);
                                    if (is_in_diagonal && !is_in_box) {
                                        const cell = board[r][c];
                                        if (Array.isArray(cell) && cell.includes(num)) {
                                            board[r][c] = cell.filter(n => n !== num);
                                            excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                        }
                                    }
                                }
                            }
                            if (excluded_cells.length > 0) {
                                const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                if (!state.silentMode) log_process(`[对角线宫区块排除] ${block_cells}构成${num}区块，排除对角线上${excluded_cells.join('、')}的${num}`);
                                return;
                            }
                        }

                        // 宫区块斜线排除逻辑
                        if (all_same_multi_diagonal && line_cells.length > 0) {
                            let excluded_cells = [];
                            for (const [r, c] of line_cells) {
                                // 检查是否在当前宫中
                                const is_in_box = (r >= start_row && r < start_row + box_size[0] && c >= start_col && c < start_col + box_size[1]);
                                if (!is_in_box) {
                                    const cell = board[r][c];
                                    if (Array.isArray(cell) && cell.includes(num)) {
                                        board[r][c] = cell.filter(n => n !== num);
                                        excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                    }
                                }
                            }
                            if (excluded_cells.length > 0) {
                                const block_cells = num_positions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                                if (!state.silentMode) log_process(`[斜线宫区块排除] ${block_cells}构成${num}区块，排除斜线上${excluded_cells.join('、')}的${num}`);
                                return;
                            }
                        }
                    }

                    // 原有单一候选数逻辑
                    if (num_positions[num].length === 0) {
                        has_conflict = true;
                        const box_num = box_row * (size / box_size[1]) + box_col + 1;
                        if (!state.silentMode) log_process(`[冲突] ${box_num}宫中数字${num}无可填入位置，无解`);
                        return true;
                    }
                }
            }
        }
    }
    return has_conflict;
}

// 检查行列区块排除（合并函数）
function check_Row_Col_Block_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;
    
    // 如果是缺一门数独模式，执行特殊排除逻辑
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
        // 正常数独模式下的原有逻辑
        // 行区块逻辑
        for (let row = 0; row < size; row++) {
            const num_positions = {};
            const existing_nums = new Set();
            
            // 收集行中已存在的数字
            for (let col = 0; col < size; col++) {
                if (typeof board[row][col] === 'number') {
                    existing_nums.add(board[row][col]);
                }
            }

            for (let num = 1; num <= size; num++) {
                num_positions[num] = [];
                if (existing_nums.has(num)) continue;

                for (let col = 0; col < size; col++) {
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        num_positions[num].push(col);
                    }
                }

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

                    // 对角线数独的特殊区块逻辑（行区块）
                    if (state.current_mode === 'diagonal') {
                        // 检查数字是否既有在对角线上又有不在对角线上
                        const has_diagonal = num_positions[num].some(col => row === col || row + col === size - 1);
                        const has_non_diagonal = num_positions[num].some(col => row !== col && row + col !== size - 1);

                        if (has_diagonal && has_non_diagonal) {
                            // 检查不在对角线上的数字是否在同一列
                            const non_diagonal_positions = num_positions[num].filter(col => row !== col && row + col !== size - 1);
                            const all_same_col_non_diagonal = non_diagonal_positions.every(col => col === non_diagonal_positions[0]);
                            if (all_same_col_non_diagonal) {
                                const target_col = non_diagonal_positions[0];
                                // 检查在对角线上的数字是否在同一条对角线上
                                const diagonal_positions = num_positions[num].filter(col => row === col || row + col === size - 1);
                                const is_main_diagonal = diagonal_positions.every(col => row === col);
                                const is_anti_diagonal = diagonal_positions.every(col => row + col === size - 1);

                                if (is_main_diagonal || is_anti_diagonal) {
                                    // 找到该列和该对角线重叠的格子
                                    let overlapping_cells = [];
                                    for (let r = 0; r < size; r++) {
                                        const c = target_col;
                                        if (is_main_diagonal && r === c) {
                                            overlapping_cells.push([r, c]);
                                        } else if (is_anti_diagonal && r + c === size - 1) {
                                            overlapping_cells.push([r, c]);
                                        }
                                    }
                                    // 检查这些格子是否不在本行
                                    let excluded_cells = [];
                                    for (const [r, c] of overlapping_cells) {
                                        if (r !== row) {
                                            const cell = board[r][c];
                                            if (Array.isArray(cell) && cell.includes(num)) {
                                                board[r][c] = cell.filter(n => n !== num);
                                                excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                            }
                                        }
                                    }
                                    if (excluded_cells.length > 0) {
                                        const block_cells = num_positions[num].map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                                        if (!state.silentMode) {
                                            log_process(`[特殊对角线行区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                        }
                                        return;
                                    }
                                }
                            }
                        }
                    }

                    // 斜线数独的特殊区块逻辑（行区块）
                    if (state.current_mode === 'multi_diagonal') {
                        const mark_lines = get_all_mark_lines();
                        for (const [start, end] of mark_lines) {
                            const line_cells = get_cells_on_line(size, start, end);
                            const is_on_line = pos => line_cells.some(([r, c]) => r === row && c === pos);
                            const has_line = num_positions[num].some(is_on_line);
                            const has_non_line = num_positions[num].some(col => !is_on_line(col));
                            if (has_line && has_non_line) {
                                // 检查不在斜线上的数字是否在同一列
                                const non_line_positions = num_positions[num].filter(col => !is_on_line(col));
                                const all_same_col_non_line = non_line_positions.every(col => col === non_line_positions[0]);
                                if (all_same_col_non_line) {
                                    const target_col = non_line_positions[0];
                                    // 检查在斜线上的数字是否都在同一条斜线上
                                    const line_positions = num_positions[num].filter(is_on_line);
                                    const all_on_this_line = line_positions.length > 0 && line_positions.every(is_on_line);
                                    if (all_on_this_line) {
                                        // 找到该列和该斜线重叠的格子
                                        let overlapping_cells = [];
                                        for (let r = 0; r < size; r++) {
                                            const c = target_col;
                                            if (line_cells.some(([lr, lc]) => lr === r && lc === c)) {
                                                overlapping_cells.push([r, c]);
                                            }
                                        }
                                        // 检查这些格子是否不在本行
                                        let excluded_cells = [];
                                        for (const [r, c] of overlapping_cells) {
                                            if (r !== row) {
                                                const cell = board[r][c];
                                                if (Array.isArray(cell) && cell.includes(num)) {
                                                    board[r][c] = cell.filter(n => n !== num);
                                                    excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                                }
                                            }
                                        }
                                        if (excluded_cells.length > 0) {
                                            const block_cells = num_positions[num].map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                                            if (!state.silentMode) {
                                                log_process(`[特殊斜线行区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                            }
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (num_positions[num].length === 0) {
                    has_conflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }

        // 列区块逻辑
        for (let col = 0; col < size; col++) {
            const num_positions = {};
            const existing_nums = new Set();
            
            // 收集列中已存在的数字
            for (let row = 0; row < size; row++) {
                if (typeof board[row][col] === 'number') {
                    existing_nums.add(board[row][col]);
                }
            }

            for (let num = 1; num <= size; num++) {
                num_positions[num] = [];
                if (existing_nums.has(num)) continue;

                for (let row = 0; row < size; row++) {
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        num_positions[num].push(row);
                    }
                }

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

                    // 对角线数独的特殊区块逻辑（列区块）
                    if (state.current_mode === 'diagonal') {
                        // 检查数字是否既有在对角线上又有不在对角线上
                        const has_diagonal = num_positions[num].some(row => row === col || row + col === size - 1);
                        const has_non_diagonal = num_positions[num].some(row => row !== col && row + col !== size - 1);

                        if (has_diagonal && has_non_diagonal) {
                            // 检查不在对角线上的数字是否在同一行
                            const non_diagonal_positions = num_positions[num].filter(row => row !== col && row + col !== size - 1);
                            const all_same_row_non_diagonal = non_diagonal_positions.every(row => row === non_diagonal_positions[0]);
                            if (all_same_row_non_diagonal) {
                                const target_row = non_diagonal_positions[0];
                                // 检查在对角线上的数字是否在同一条对角线上
                                const diagonal_positions = num_positions[num].filter(row => row === col || row + col === size - 1);
                                const is_main_diagonal = diagonal_positions.every(row => row === col);
                                const is_anti_diagonal = diagonal_positions.every(row => row + col === size - 1);

                                if (is_main_diagonal || is_anti_diagonal) {
                                    // 找到该行和该对角线重叠的格子
                                    let overlapping_cells = [];
                                    for (let c = 0; c < size; c++) {
                                        const r = target_row;
                                        if (is_main_diagonal && r === c) {
                                            overlapping_cells.push([r, c]);
                                        } else if (is_anti_diagonal && r + c === size - 1) {
                                            overlapping_cells.push([r, c]);
                                        }
                                    }
                                    // 检查这些格子是否不在本列
                                    let excluded_cells = [];
                                    for (const [r, c] of overlapping_cells) {
                                        if (c !== col) {
                                            const cell = board[r][c];
                                            if (Array.isArray(cell) && cell.includes(num)) {
                                                board[r][c] = cell.filter(n => n !== num);
                                                excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                            }
                                        }
                                    }
                                    if (excluded_cells.length > 0) {
                                        const block_cells = num_positions[num].map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                                        if (!state.silentMode) {
                                            log_process(`[特殊对角线列区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                        }
                                        return;
                                    }
                                }
                            }
                        }
                    }

                    // 斜线数独的特殊区块逻辑（列区块）
                    if (state.current_mode === 'multi_diagonal') {
                        const mark_lines = get_all_mark_lines();
                        for (const [start, end] of mark_lines) {
                            const line_cells = get_cells_on_line(size, start, end);
                            const is_on_line = pos => line_cells.some(([r, c]) => r === pos && c === col);
                            const has_line = num_positions[num].some(is_on_line);
                            const has_non_line = num_positions[num].some(row => !is_on_line(row));
                            if (has_line && has_non_line) {
                                // 检查不在斜线上的数字是否在同一行
                                const non_line_positions = num_positions[num].filter(row => !is_on_line(row));
                                const all_same_row_non_line = non_line_positions.every(row => row === non_line_positions[0]);
                                if (all_same_row_non_line) {
                                    const target_row = non_line_positions[0];
                                    // 检查在斜线上的数字是否都在同一条斜线上
                                    const line_positions = num_positions[num].filter(is_on_line);
                                    const all_on_this_line = line_positions.length > 0 && line_positions.every(is_on_line);
                                    if (all_on_this_line) {
                                        // 找到该行和该斜线重叠的格子
                                        let overlapping_cells = [];
                                        for (let c = 0; c < size; c++) {
                                            const r = target_row;
                                            if (line_cells.some(([lr, lc]) => lr === r && lc === c)) {
                                                overlapping_cells.push([r, c]);
                                            }
                                        }
                                        // 检查这些格子是否不在本列
                                        let excluded_cells = [];
                                        for (const [r, c] of overlapping_cells) {
                                            if (c !== col) {
                                                const cell = board[r][c];
                                                if (Array.isArray(cell) && cell.includes(num)) {
                                                    board[r][c] = cell.filter(n => n !== num);
                                                    excluded_cells.push(`${getRowLetter(r+1)}${c+1}`);
                                                }
                                            }
                                        }
                                        if (excluded_cells.length > 0) {
                                            const block_cells = num_positions[num].map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                                            if (!state.silentMode) {
                                                log_process(`[特殊斜线列区块排除] ${block_cells}构成${num}区块，排除${excluded_cells.join('、')}的${num}`);
                                            }
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (num_positions[num].length === 0) {
                    has_conflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }
    }
    return has_conflict;
}

// 检查宫显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Box_Naked_Subset_Elimination(board, size, subsetSize = 2) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            // 计算宫的起始行列
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            // 收集宫内的所有候选格及其候选数
            const candidates = [];
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    const cell = board[r][c];
                    if (Array.isArray(cell)) {
                        if (cell.length === 0) {
                            hasConflict = true;
                            if (!state.silentMode) log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                            return true;
                        }
                        candidates.push({
                            pos: [r, c],
                            nums: [...cell]
                        });
                    }
                }
            }
            
            // 检查指定大小的组合
            const combinations = getCombinations(candidates, subsetSize);
            
            for (const combo of combinations) {
                // 合并所有候选数
                const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
                // 如果合并后的候选数数量等于子集大小，则形成显性数组
                if (unionNums.length === subsetSize) {
                    const affectedCells = [];
                    
                    // 从宫的其他格子中排除这些候选数
                    for (const cell of candidates) {
                        if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                            const originalLength = cell.nums.length;
                            cell.nums = cell.nums.filter(n => !unionNums.includes(n));
                            board[cell.pos[0]][cell.pos[1]] = cell.nums;
                            
                            if (cell.nums.length < originalLength) {
                                affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                            }
                        }
                    }
                    
                    if (affectedCells.length > 0) {
                        const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
                        const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                        if (!state.silentMode) log_process(`[宫显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                        return;
                    }
                }
            }
        }
    }
    
    return hasConflict;
}

// // 检查行显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Row_Naked_Subset_Elimination(board, size, subsetSize = 2) {
//     let hasConflict = false;
    
//     for (let row = 0; row < size; row++) {
//         // 收集行内的所有候选格及其候选数
//         const candidates = [];
//         for (let col = 0; col < size; col++) {
//             const cell = board[row][col];
//             if (Array.isArray(cell)) {
//                 if (cell.length === 0) {
//                     hasConflict = true;
//                     if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidates.push({
//                     pos: [row, col],
//                     nums: [...cell]
//                 });
//             }
//         }
        
//         // 检查指定大小的组合
//         const combinations = getCombinations(candidates, subsetSize);
        
//         for (const combo of combinations) {
//             // 合并所有候选数
//             const unionNums = [...new Set(combo.flatMap(c => c.nums))];
            
//             // 如果合并后的候选数数量等于子集大小，则形成显性数组
//             if (unionNums.length === subsetSize) {
//                 const affectedCells = [];
                
//                 // 从行的其他格子中排除这些候选数
//                 for (const cell of candidates) {
//                     if (!combo.some(c => c.pos[1] === cell.pos[1])) {
//                         const originalLength = cell.nums.length;
//                         cell.nums = cell.nums.filter(n => !unionNums.includes(n));
//                         board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        
//                         if (cell.nums.length < originalLength) {
//                             affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
//                         }
//                     }
//                 }
                
//                 if (affectedCells.length > 0) {
//                     const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
//                     const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
//                     if (!state.silentMode) log_process(`[行显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
//                     return;
//                 }
//             }
//         }
//     }
    
//     return hasConflict;
// }

// // 检查列显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Col_Naked_Subset_Elimination(board, size, subsetSize = 2) {
//     let hasConflict = false;
    
//     for (let col = 0; col < size; col++) {
//         // 收集列内的所有候选格及其候选数
//         const candidates = [];
//         for (let row = 0; row < size; row++) {
//             const cell = board[row][col];
//             if (Array.isArray(cell)) {
//                 if (cell.length === 0) {
//                     hasConflict = true;
//                     if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidates.push({
//                     pos: [row, col],
//                     nums: [...cell]
//                 });
//             }
//         }
        
//         // 检查指定大小的组合
//         const combinations = getCombinations(candidates, subsetSize);
        
//         for (const combo of combinations) {
//             // 合并所有候选数
//             const unionNums = [...new Set(combo.flatMap(c => c.nums))];
            
//             // 如果合并后的候选数数量等于子集大小，则形成显性数组
//             if (unionNums.length === subsetSize) {
//                 const affectedCells = [];
                
//                 // 从列的其他格子中排除这些候选数
//                 for (const cell of candidates) {
//                     if (!combo.some(c => c.pos[0] === cell.pos[0])) {
//                         const originalLength = cell.nums.length;
//                         cell.nums = cell.nums.filter(n => !unionNums.includes(n));
//                         board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        
//                         if (cell.nums.length < originalLength) {
//                             affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
//                         }
//                     }
//                 }
                
//                 if (affectedCells.length > 0) {
//                     const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
//                     const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
//                     if (!state.silentMode) log_process(`[列显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
//                     return;
//                 }
//             }
//         }
//     }
    
//     return hasConflict;
// }

// 检查行列显性数组（合并函数，可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Row_Col_Naked_Subset_Elimination(board, size, subset_size = 2) {
    let has_conflict = false;
    
    // 行显性数组逻辑
    for (let row = 0; row < size; row++) {
        const candidates = [];
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                if (cell.length === 0) {
                    has_conflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidates.push({
                    pos: [row, col],
                    nums: [...cell]
                });
            }
        }
        
        const combinations = getCombinations(candidates, subset_size);
        for (const combo of combinations) {
            const union_nums = [...new Set(combo.flatMap(c => c.nums))];
            if (union_nums.length === subset_size) {
                const affected_cells = [];
                for (const cell of candidates) {
                    if (!combo.some(c => c.pos[1] === cell.pos[1])) {
                        const original_length = cell.nums.length;
                        cell.nums = cell.nums.filter(n => !union_nums.includes(n));
                        board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        if (cell.nums.length < original_length) {
                            affected_cells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                        }
                    }
                }
                
                if (affected_cells.length > 0) {
                    const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                    const subset_cells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[行显性${subset_name}] ${subset_cells}构成${subset_name}${union_nums.join('')}，排除${affected_cells.join('、')}的${union_nums.join('、')}`);
                    }
                    return;
                }
            }
        }
    }

    // 列显性数组逻辑
    for (let col = 0; col < size; col++) {
        const candidates = [];
        for (let row = 0; row < size; row++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                if (cell.length === 0) {
                    has_conflict = true;
                    if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidates.push({
                    pos: [row, col],
                    nums: [...cell]
                });
            }
        }
        
        const combinations = getCombinations(candidates, subset_size);
        for (const combo of combinations) {
            const union_nums = [...new Set(combo.flatMap(c => c.nums))];
            if (union_nums.length === subset_size) {
                const affected_cells = [];
                for (const cell of candidates) {
                    if (!combo.some(c => c.pos[0] === cell.pos[0])) {
                        const original_length = cell.nums.length;
                        cell.nums = cell.nums.filter(n => !union_nums.includes(n));
                        board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        if (cell.nums.length < original_length) {
                            affected_cells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                        }
                    }
                }
                
                if (affected_cells.length > 0) {
                    const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
                    const subset_cells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                    if (!state.silentMode) {
                        log_process(`[列显性${subset_name}] ${subset_cells}构成${subset_name}${union_nums.join('')}，排除${affected_cells.join('、')}的${union_nums.join('、')}`);
                    }
                    return;
                }
            }
        }
    }
    return has_conflict;
}

// // 检查宫隐性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Box_Hidden_Subset_Elimination(board, size, subsetSize = 2) {
//     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
//     let hasConflict = false;
    
//     // 遍历每个宫
//     for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
//         for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
//             const startRow = boxRow * boxSize[0];
//             const startCol = boxCol * boxSize[1];
            
//             // 收集宫内的所有候选格
//             const candidateCells = [];
//             for (let r = startRow; r < startRow + boxSize[0]; r++) {
//                 for (let c = startCol; c < startCol + boxSize[1]; c++) {
//                     if (Array.isArray(board[r][c])) {
//                         if (board[r][c].length === 0) {
//                             hasConflict = true;
//                             if (!state.silentMode) log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
//                             return true;
//                         }
//                         candidateCells.push([r, c]);
//                     }
//                 }
//             }
            
//             // 检查1-size的所有数字组合（根据subsetSize决定组合大小）
//             const nums = Array.from({length: size}, (_, i) => i + 1);
//             const numCombinations = getCombinations(nums, subsetSize);
            
//             for (const numGroup of numCombinations) {
//                 // 统计这些数字在哪些候选格中出现
//                 const positions = [];
//                 for (const [r, c] of candidateCells) {
//                     if (numGroup.some(n => board[r][c].includes(n))) {
//                         positions.push([r, c]);
//                     }
//                 }
                
//                 // 如果这些数字出现的候选格正好等于子集大小
//                 if (positions.length === subsetSize) {
//                     // 检查这些格子是否都包含这些数字
//                     let isSubset = true;
//                     for (const [r, c] of positions) {
//                         if (!numGroup.every(n => board[r][c].includes(n))) {
//                             isSubset = false;
//                             break;
//                         }
//                     }
                    
//                     if (isSubset) {
//                         let modified = false;
//                         // 从这些格子中删除其他数字
//                         for (const [r, c] of positions) {
//                             const originalLength = board[r][c].length;
//                             board[r][c] = board[r][c].filter(n => numGroup.includes(n));
//                             if (board[r][c].length < originalLength) {
//                                 modified = true;
//                             }
//                         }
                        
//                         if (modified) {
//                             const subsetName = 
//                                 subsetSize === 2 ? '数对' : 
//                                 subsetSize === 3 ? '三数组' : '四数组';
//                             const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
//                             if (!state.silentMode) log_process(`[宫隐性${subsetName}] ${cells}构成隐性${subsetName}${numGroup.join('')}，删除其他候选数`);
//                             return;
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return hasConflict;
// }

// 检查宫隐性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Box_Hidden_Subset_Elimination(board, size, subset_size = 2) {
    // 宫的大小定义（兼容6宫格）
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
        // 正常数独模式下的原有逻辑
        for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
            for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
                const start_row = box_row * box_size[0];
                const start_col = box_col * box_size[1];
                
                // 收集宫内的所有候选格
                const candidate_cells = [];
                for (let r = start_row; r < start_row + box_size[0]; r++) {
                    for (let c = start_col; c < start_col + box_size[1]; c++) {
                        if (Array.isArray(board[r][c])) {
                            if (board[r][c].length === 0) {
                                has_conflict = true;
                                if (!state.silentMode) log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                                return true;
                            }
                            candidate_cells.push([r, c]);
                        }
                    }
                }
                
                // 检查1-size的所有数字组合
                const nums = Array.from({length: size}, (_, i) => i + 1);
                const num_combinations = getCombinations(nums, subset_size);
                
                for (const num_group of num_combinations) {
                    // 统计这些数字在哪些候选格中出现
                    const positions = [];
                    for (const [r, c] of candidate_cells) {
                        if (num_group.some(n => board[r][c].includes(n))) {
                            positions.push([r, c]);
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
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}

// // 检查行隐性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Row_Hidden_Subset_Elimination(board, size, subset_size = 2) {
//     // 仅缺一门数独模式有效
//     if (state.current_mode !== 'missing') return false;
    
//     let has_conflict = false;
    
//     // 遍历每一行
//     for (let row = 0; row < size; row++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 先收集行中已存在的数字
//         for (let col = 0; col < size; col++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let col = 0; col < size; col++) {
//                 if (board[row][col] === -1) continue; // 跳过黑格
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(col);
//                 }
//             }
            
//             // 记录没有可填位置的数字
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查是否有欠一数对组标记
//         const subset_info = state.row_missing_subsets[`row_${row}`];

//         // 4. 通用逻辑：检测 (subset_size) 个数字只能填在 (subset_size-1) 个格子的情况
//         if (subset_size >= 2 && subset_size <= 4) {
//             // 生成所有可能的数字组合（过滤掉已存在和缺失的数字）
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, subset_size);

//             for (const num_group of num_combinations) {
//                 // 如果有欠一数对组标记，跳过已标记的数字组合
//                 if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

//                 // 统计这些数字在哪些候选格中出现
//                 const positions = new Set();
//                 for (const num of num_group) {
//                     if (num_positions[num]) {
//                         for (const col of num_positions[num]) {
//                             positions.add(col);
//                         }
//                     }
//                 }

//                 // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
//                 if (positions.size === subset_size - 1) {
//                     const pos_array = Array.from(positions).map(col => col);
                    
//                     // 检查这些格子是否都包含至少两个目标数字
//                     let is_valid = true;
//                     for (const col of pos_array) {
//                         const cell = board[row][col];
//                         const count = num_group.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         // 从这些格子中删除其他数字
//                         for (const col of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => num_group.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const subset_name = 
//                                 subset_size === 2 ? '数对' : 
//                                 subset_size === 3 ? '三数组' : '四数组';
//                             const cells = pos_array.map(col => 
//                                 `${getRowLetter(row+1)}${col+1}`).join('、');
//                             if (!state.silentMode) {
//                                 log_process(`[行隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
//                             }

//                             // 记录欠一数对组信息
//                             state.row_missing_subsets[`row_${row}`] = {
//                                 nums: num_group,
//                                 positions: pos_array.map(col => `${row},${col}`)
//                             };
//                             return; // 每次只处理一个发现
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return has_conflict;
// }

// // 检查列隐性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Col_Hidden_Subset_Elimination(board, size, subset_size = 2) {
//     // 仅缺一门数独模式有效
//     if (state.current_mode !== 'missing') return false;
    
//     let has_conflict = false;
    
//     // 遍历每一列
//     for (let col = 0; col < size; col++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 先收集列中已存在的数字
//         for (let row = 0; row < size; row++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在列中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let row = 0; row < size; row++) {
//                 if (board[row][col] === -1) continue; // 跳过黑格
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(row);
//                 }
//             }
            
//             // 记录没有可填位置的数字
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查是否有欠一数对组标记
//         const subset_info = state.col_missing_subsets[`col_${col}`];

//         // 4. 通用逻辑：检测 (subset_size) 个数字只能填在 (subset_size-1) 个格子的情况
//         if (subset_size >= 2 && subset_size <= 4) {
//             // 生成所有可能的数字组合（过滤掉已存在和缺失的数字）
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, subset_size);

//             for (const num_group of num_combinations) {
//                 // 如果有欠一数对组标记，跳过已标记的数字组合
//                 if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

//                 // 统计这些数字在哪些候选格中出现
//                 const positions = new Set();
//                 for (const num of num_group) {
//                     if (num_positions[num]) {
//                         for (const row of num_positions[num]) {
//                             positions.add(row);
//                         }
//                     }
//                 }

//                 // 检查是否满足条件：数字只能填在 (subset_size-1) 个格子中
//                 if (positions.size === subset_size - 1) {
//                     const pos_array = Array.from(positions).map(row => row);
                    
//                     // 检查这些格子是否都包含至少两个目标数字
//                     let is_valid = true;
//                     for (const row of pos_array) {
//                         const cell = board[row][col];
//                         const count = num_group.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         // 从这些格子中删除其他数字
//                         for (const row of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => num_group.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const subset_name = 
//                                 subset_size === 2 ? '数对' : 
//                                 subset_size === 3 ? '三数组' : '四数组';
//                             const cells = pos_array.map(row => 
//                                 `${getRowLetter(row+1)}${col+1}`).join('、');
//                             if (!state.silentMode) {
//                                 log_process(`[列隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
//                             }

//                             // 记录欠一数对组信息
//                             state.col_missing_subsets[`col_${col}`] = {
//                                 nums: num_group,
//                                 positions: pos_array.map(row => `${row},${col}`)
//                             };
//                             return; // 每次只处理一个发现
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return has_conflict;
// }

// // 检查行列隐性数组（合并函数，可指定子集大小：2=数对，3=三数组，4=四数组）
// function check_Row_Col_Hidden_Subset_Elimination(board, size, subset_size = 2) {
//     let has_conflict = false;
//     log_process(`调用行列隐性数组`);
    
//     // 行隐性数组逻辑
//     for (let row = 0; row < size; row++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 收集行中已存在的数字
//         for (let col = 0; col < size; col++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在行中的候选格位置（跳过黑格和已存在的数字）
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let col = 0; col < size; col++) {
//                 if (board[row][col] === -1) continue;
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(col);
//                 }
//             }
            
//             // 记录没有可填位置的数字
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查是否有欠一数对组标记
//         const subset_info = state.row_missing_subsets[`row_${row}`];

//         // 4. 检测隐性数组
//         if (subset_size >= 2 && subset_size <= 4) {
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, subset_size);

//             for (const num_group of num_combinations) {
//                 // 跳过已标记的数字组合
//                 if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

//                 const positions = new Set();
//                 for (const num of num_group) {
//                     if (num_positions[num]) {
//                         for (const col of num_positions[num]) {
//                             positions.add(col);
//                         }
//                     }
//                 }

//                 // 检查是否满足条件
//                 if (positions.size === subset_size - 1) {
//                     const pos_array = Array.from(positions);
//                     let is_valid = true;
//                     for (const col of pos_array) {
//                         const cell = board[row][col];
//                         const count = num_group.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         for (const col of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => num_group.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
//                             const cells = pos_array.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
//                             if (!state.silentMode) {
//                                 log_process(`[行隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
//                             }
//                             state.row_missing_subsets[`row_${row}`] = {
//                                 nums: num_group,
//                                 positions: pos_array.map(col => `${row},${col}`)
//                             };
//                             return;
//                         }
//                     }
//                 }
//             }
//         }
//     }

//     // 列隐性数组逻辑
//     for (let col = 0; col < size; col++) {
//         const num_positions = {};
//         const missing_nums = [];
//         const existing_nums = new Set();

//         // 1. 收集列中已存在的数字
//         for (let row = 0; row < size; row++) {
//             if (typeof board[row][col] === 'number' && board[row][col] !== -1) {
//                 existing_nums.add(board[row][col]);
//             }
//         }

//         // 2. 统计数字在列中的候选格位置
//         for (let num = 1; num <= size; num++) {
//             if (existing_nums.has(num)) continue;
//             num_positions[num] = [];
            
//             for (let row = 0; row < size; row++) {
//                 if (board[row][col] === -1) continue;
//                 if (Array.isArray(board[row][col]) && board[row][col].includes(num)) {
//                     num_positions[num].push(row);
//                 }
//             }
            
//             if (num_positions[num].length === 0) {
//                 missing_nums.push(num);
//             }
//         }

//         // 3. 检查欠一数对组标记
//         const subset_info = state.col_missing_subsets[`col_${col}`];

//         // 4. 检测隐性数组
//         if (subset_size >= 2 && subset_size <= 4) {
//             const all_nums = Array.from({length: size}, (_, i) => i + 1)
//                 .filter(num => !existing_nums.has(num) && !missing_nums.includes(num));
//             const num_combinations = getCombinations(all_nums, subset_size);

//             for (const num_group of num_combinations) {
//                 if (subset_info && subset_info.nums.some(n => num_group.includes(n))) continue;

//                 const positions = new Set();
//                 for (const num of num_group) {
//                     if (num_positions[num]) {
//                         for (const row of num_positions[num]) {
//                             positions.add(row);
//                         }
//                     }
//                 }

//                 if (positions.size === subset_size - 1) {
//                     const pos_array = Array.from(positions);
//                     let is_valid = true;
//                     for (const row of pos_array) {
//                         const cell = board[row][col];
//                         const count = num_group.filter(n => cell.includes(n)).length;
//                         if (count < 2) {
//                             is_valid = false;
//                             break;
//                         }
//                     }

//                     if (is_valid) {
//                         let modified = false;
//                         for (const row of pos_array) {
//                             const original_length = board[row][col].length;
//                             board[row][col] = board[row][col].filter(n => num_group.includes(n));
//                             if (board[row][col].length < original_length) {
//                                 modified = true;
//                             }
//                         }

//                         if (modified) {
//                             const subset_name = subset_size === 2 ? '数对' : subset_size === 3 ? '三数组' : '四数组';
//                             const cells = pos_array.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
//                             if (!state.silentMode) {
//                                 log_process(`[列隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
//                             }
//                             state.col_missing_subsets[`col_${col}`] = {
//                                 nums: num_group,
//                                 positions: pos_array.map(row => `${row},${col}`)
//                             };
//                             return;
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     return has_conflict;
// }

// 检查行列隐性数组（合并函数，可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Row_Col_Hidden_Subset_Elimination(board, size, subset_size = 2) {
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
        // 正常数独模式下的原有逻辑
        // 行隐性数组逻辑
        for (let row = 0; row < size; row++) {
            // 收集行内的所有候选格
            const candidate_cells = [];
            for (let col = 0; col < size; col++) {
                if (Array.isArray(board[row][col])) {
                    if (board[row][col].length === 0) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                        return true;
                    }
                    candidate_cells.push([row, col]);
                }
            }
            
            // 检查1-size的所有数字组合
            const nums = Array.from({length: size}, (_, i) => i + 1);
            const num_combinations = getCombinations(nums, subset_size);
            
            for (const num_group of num_combinations) {
                // 统计这些数字在哪些候选格中出现
                const positions = [];
                for (const [r, c] of candidate_cells) {
                    if (num_group.some(n => board[r][c].includes(n))) {
                        positions.push([r, c]);
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
                                log_process(`[行隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                            }
                            return;
                        }
                    }
                }
            }
        }

        // 列隐性数组逻辑
        for (let col = 0; col < size; col++) {
            // 收集列内的所有候选格
            const candidate_cells = [];
            for (let row = 0; row < size; row++) {
                if (Array.isArray(board[row][col])) {
                    if (board[row][col].length === 0) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                        return true;
                    }
                    candidate_cells.push([row, col]);
                }
            }
            
            // 检查1-size的所有数字组合
            const nums = Array.from({length: size}, (_, i) => i + 1);
            const num_combinations = getCombinations(nums, subset_size);
            
            for (const num_group of num_combinations) {
                // 统计这些数字在哪些候选格中出现
                const positions = [];
                for (const [r, c] of candidate_cells) {
                    if (num_group.some(n => board[r][c].includes(n))) {
                        positions.push([r, c]);
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
                                log_process(`[列隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}，删除其他候选数`);
                            }
                            return;
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}