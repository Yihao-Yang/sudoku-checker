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
    create_sudoku_grid
} from './modules/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';
import { 
    check_uniqueness
} from './modules/classic.js';

import {
    generate_puzzle, fill_puzzle_to_grid
} from './solver/generate.js'
import { state } from './modules/state.js';

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
    // generatepuzzleBtn.addEventListener('click', () => generate_puzzle(9));
    

    // generatepuzzleBtn.addEventListener('click', async () => {
    //     generate_puzzle(state.current_grid_size);
    // });
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
    document.getElementById('saveAsImage').addEventListener('click', save_sudoku_as_image);

    // 分值下限输入框
    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.id = 'scoreLowerLimit';
    scoreInput.placeholder = '分值下限';
    scoreInput.value = '0';
    scoreInput.style.width = '40px';
    scoreInput.style.marginLeft = '10px';

    generatepuzzleBtn.parentNode.insertBefore(scoreInput, generatepuzzleBtn.nextSibling);

    // 挖洞数量输入框
    const holesInput = document.createElement('input');
    holesInput.type = 'number';
    holesInput.id = 'holesCount';
    holesInput.placeholder = '挖洞数量';
    holesInput.value = '';
    holesInput.style.width = '80px';
    holesInput.style.marginLeft = '10px';

    scoreInput.parentNode.insertBefore(holesInput, scoreInput.nextSibling);


    // 新增：批量自动出题和保存图片
    const batchBtn = document.createElement('button');
    batchBtn.id = 'batchGenerateSave';
    batchBtn.textContent = '自动批量';
    batchBtn.style.marginLeft = '5px';

    const batchInput = document.createElement('input');
    batchInput.type = 'number';
    batchInput.id = 'batchCount';
    batchInput.min = '1';
    batchInput.value = '10';
    batchInput.style.width = '40px';
    batchInput.style.marginLeft = '10px';

    // generatepuzzleBtn.parentNode.insertBefore(batchBtn, generatepuzzleBtn.nextSibling);
    scoreInput.parentNode.insertBefore(batchBtn, scoreInput.nextSibling);
    batchBtn.parentNode.insertBefore(batchInput, batchBtn.nextSibling);

    generatepuzzleBtn.addEventListener('click', async () => {
        const scoreLowerLimit = parseInt(scoreInput.value, 10) || 0;
        const holesCount = parseInt(holesInput.value, 10);
        generate_puzzle(state.current_grid_size, scoreLowerLimit, holesCount);
    });

    batchBtn.addEventListener('click', async () => {
        const count = parseInt(batchInput.value, 10);
        const score_lower_limit = parseInt(scoreInput.value, 10) || 0;
        const holes_count = parseInt(holesInput.value, 10);
        if (isNaN(count) || count < 1) return;
        for (let i = 0; i < count; i++) {
            generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
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