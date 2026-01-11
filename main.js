import { 
    hide_solution,
    clear_all_inputs,
    import_sudoku_from_string,
    export_sudoku_to_string,
    restore_original_board,
    save_sudoku_as_image,
    change_candidates_mode,
    show_generating_timer,
    hide_generating_timer
} from './solver/core.js';

import { 
    create_sudoku_grid, check_uniqueness
} from './solver/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';

import {
    generate_puzzle, fill_puzzle_to_grid
} from './solver/generate.js'
import { state } from './solver/state.js';
import { generate_multi_diagonal_puzzle } from './modules/multi_diagonal.js';
import { generate_vx_puzzle } from './modules/vx.js';
import { generate_extra_region_puzzle } from './modules/extra_region.js';
import { generate_renban_puzzle } from './modules/renban.js';
import { generate_exclusion_puzzle } from './modules/exclusion.js';
import { generate_quadruple_puzzle } from './modules/quadruple.js';
import { generate_ratio_puzzle } from './modules/ratio.js';
import { generate_odd_puzzle } from './modules/odd.js';
import { generate_odd_even_puzzle } from './modules/odd_even.js';
import { create_ratio_sudoku } from './modules/ratio.js';

// 初始化事件处理程序

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

    // ...existing code...
    document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
        state.is_candidates_mode = !state.is_candidates_mode;
        this.textContent = state.is_candidates_mode ? '退出候选数模式' : '进入候选数模式';
        // 重新获取当前输入框引用
        const size = state.current_grid_size;
        const inputs = Array.from({ length: size }, (_, row) =>
            Array.from({ length: size }, (_, col) =>
                document.querySelector(`.sudoku-cell input[data-row="${row}"][data-col="${col}"]`)
            )
        );
        change_candidates_mode(inputs, size, false);
    });
    // ...existing code...

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
    scoreInput.style.width = '80px';
    scoreInput.style.marginLeft = '10px';

    generatepuzzleBtn.parentNode.insertBefore(scoreInput, generatepuzzleBtn.nextSibling);

    // // 提示数数量输入框
    // const cluesInput = document.createElement('input');
    // cluesInput.type = 'number';
    // cluesInput.id = 'cluesCount';
    // cluesInput.placeholder = '提示数';
    // cluesInput.value = '';
    // cluesInput.style.width = '70px';
    // cluesInput.style.marginLeft = '10px';

    // scoreInput.parentNode.insertBefore(cluesInput, scoreInput.nextSibling);


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
    batchInput.value = '';
    batchInput.style.width = '50px';
    batchInput.style.marginLeft = '10px';

    // generatepuzzleBtn.parentNode.insertBefore(batchBtn, generatepuzzleBtn.nextSibling);
    scoreInput.parentNode.insertBefore(batchBtn, scoreInput.nextSibling);
    batchBtn.parentNode.insertBefore(batchInput, batchBtn.nextSibling);

    generatepuzzleBtn.addEventListener('click', async () => {
        const scoreLowerLimit = parseInt(scoreInput.value, 10) || 0;
        // const holesCount = parseInt(holesInput.value, 10);
        // const cluesCount = parseInt(cluesInput.value, 10) || 0;
        const cluesCount = 0;
        const size = state.current_grid_size;
        const holesCount = size * size - (isNaN(cluesCount) ? 0 : cluesCount);
        // const holesCount = size * size - 0;
        // generate_puzzle(state.current_grid_size, scoreLowerLimit, holesCount);
        show_generating_timer();

        setTimeout(() => {
            generate_puzzle(state.current_grid_size, scoreLowerLimit, holesCount);
            hide_generating_timer();
        }, 0);
    });

    batchBtn.addEventListener('click', async () => {
        const count = parseInt(batchInput.value, 10) || 1;
        const score_lower_limit = parseInt(scoreInput.value, 10) || 0;
        const size = state.current_grid_size;
        // 从 cluesInput 读取用户输入的提示数，和单次生成保持一致
        // const cluesCount = parseInt(cluesInput.value, 10) || 0;
        const cluesCount = 0;
        const holes_count = size * size - (isNaN(cluesCount) ? 0 : cluesCount);
        if (isNaN(count) || count < 1) return;
        for (let i = 0; i < count; i++) {
            if (state.current_mode === 'multi_diagonal') {
                generate_multi_diagonal_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'VX') {
                generate_vx_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'extra_region') {
                generate_extra_region_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'renban') {
                generate_renban_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'exclusion') {
                generate_exclusion_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'quadruple') {
                generate_quadruple_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'ratio') {
                generate_ratio_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'odd') {
                generate_odd_puzzle(state.current_grid_size, score_lower_limit, holes_count);
            } else if (state.current_mode === 'odd_even') {
                generate_odd_even_puzzle(state.current_grid_size, score_lower_limit, holes_count);
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