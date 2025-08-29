import { 
    check_solution, 
    hide_solution,
    clear_all_inputs,
    import_sudoku_from_string,
    export_sudoku_to_string,
    restore_original_board,
    save_sudoku_as_image
} from './modules/core.js';

import { 
    create_sudoku_grid, check_uniqueness
} from './modules/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';

import {
    generate_puzzle, fill_puzzle_to_grid
} from './solver/generate.js'
import { state } from './modules/state.js';
import { generate_multi_diagonal_puzzle } from './modules/multi_diagonal.js'; 
import { generate_extra_region_puzzle } from './modules/extra_region.js';

function initializeEventHandlers() {
    const fourGridBtn = document.getElementById('fourGrid');
    const sixGridBtn = document.getElementById('sixGrid');
    const nineGridBtn = document.getElementById('nineGrid');
    const checkSolutionBtn = document.getElementById('checkSolution');
    const checkUniquenessBtn = document.getElementById('checkUniqueness');
    const hide_solutionBtn = document.getElementById('hide_solution');
    const generatepuzzleBtn = document.getElementById('generate_puzzle');
    const clearAllBtn = document.getElementById('clearAll');

    fourGridBtn.addEventListener('click', () => create_sudoku_grid(4));
    sixGridBtn.addEventListener('click', () => create_sudoku_grid(6));
    nineGridBtn.addEventListener('click', () => create_sudoku_grid(9));
    // checkSolutionBtn.addEventListener('click', check_solution);
    checkUniquenessBtn.addEventListener('click', check_uniqueness);
    hide_solutionBtn.addEventListener('click', hide_solution);
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
    document.getElementById('saveAsImage').addEventListener('click', save_sudoku_as_image);

    document.getElementById('toggleSolveMode').addEventListener('click', function() {
        state.is_solve_mode = !state.is_solve_mode;
        this.textContent = state.is_solve_mode ? '退出解题模式' : '进入解题模式';

        // 切换所有输入框颜色
        document.querySelectorAll('.sudoku-cell input').forEach(input => {
            if (state.is_solve_mode) {
                // 进入解题模式：空格加 solve-mode
                if (!input.value) {
                    input.classList.add('solve-mode');
                }
            } else {
                // 退出解题模式：移除所有 solve-mode
                input.classList.remove('solve-mode');
                // 如果是空格，移除 solution-cell（让空格变回黑色）
                if (!input.value) {
                    input.classList.remove('solution-cell');
                }
                // input.classList.remove('solution-cell');
            }
            // if (state.is_solve_mode) {
            //     input.classList.add('solution-cell');
            // } else {
            //     input.classList.remove('solution-cell');
            // }
        });
    });

    // 监听所有输入框的输入事件（只需加一次即可）
document.addEventListener('input', function(e) {
    if (e.target.matches('.sudoku-cell input')) {
        if (state.is_solve_mode) {
            // 只有 solve-mode 的空格才变蓝
            if (e.target.classList.contains('solve-mode')) {
                if (e.target.value) {
                    e.target.classList.add('solution-cell');
                } else {
                    e.target.classList.remove('solution-cell');
                }
            }
        } else {
            // 非解题模式全部恢复黑色
            e.target.classList.remove('solution-cell');
        }
    }
});

    // 分值下限输入框
    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.id = 'scoreLowerLimit';
    scoreInput.placeholder = '分值下限';
    scoreInput.value = '';
    scoreInput.style.width = '40px';
    scoreInput.style.marginLeft = '10px';

    generatepuzzleBtn.parentNode.insertBefore(scoreInput, generatepuzzleBtn.nextSibling);

    // 提示数数量输入框
    const cluesInput = document.createElement('input');
    cluesInput.type = 'number';
    cluesInput.id = 'cluesCount';
    cluesInput.placeholder = '提示数';
    cluesInput.value = '';
    cluesInput.style.width = '70px';
    cluesInput.style.marginLeft = '10px';

    scoreInput.parentNode.insertBefore(cluesInput, scoreInput.nextSibling);


    // 新增：批量自动出题和保存图片
    const batchBtn = document.createElement('button');
    batchBtn.id = 'batchGenerateSave';
    batchBtn.textContent = '自动批量';
    batchBtn.style.marginLeft = '5px';

    const batchInput = document.createElement('input');
    batchInput.type = 'number';
    batchInput.id = 'batchCount';
    batchInput.placeholder = '题数';
    batchInput.min = '1';
    batchInput.value = '10';
    batchInput.style.width = '40px';
    batchInput.style.marginLeft = '10px';

    // generatepuzzleBtn.parentNode.insertBefore(batchBtn, generatepuzzleBtn.nextSibling);
    scoreInput.parentNode.insertBefore(batchBtn, scoreInput.nextSibling);
    batchBtn.parentNode.insertBefore(batchInput, batchBtn.nextSibling);

    generatepuzzleBtn.addEventListener('click', async () => {
        const scoreLowerLimit = parseInt(scoreInput.value, 10) || 0;
        // const holesCount = parseInt(holesInput.value, 10);
        const cluesCount = parseInt(cluesInput.value, 10) || 0;
        const size = state.current_grid_size;
        const holesCount = size * size - (isNaN(cluesCount) ? 0 : cluesCount);
        generate_puzzle(state.current_grid_size, scoreLowerLimit, holesCount);
    });

    batchBtn.addEventListener('click', async () => {
        const count = parseInt(batchInput.value, 10);
        const score_lower_limit = parseInt(scoreInput.value, 10) || 0;
        const size = state.current_grid_size;
        const holes_count = size * size - (isNaN(cluesCount) ? 0 : cluesCount);
        if (isNaN(count) || count < 1) return;
        for (let i = 0; i < count; i++) {
            if (state.current_mode === 'multi_diagonal') {
                // 如果是多斜线模式，调用对应的生成函数
                generate_multi_diagonal_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'extra_region') {
                generate_extra_region_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else {
                generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            }
            // 等待出题和保存图片完成
            await new Promise(resolve => setTimeout(resolve, 800));
            save_sudoku_as_image(true);
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    // 默认创建4宫格
    create_sudoku_grid(4);
});