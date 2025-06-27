import { 
    check_solution, 
    hide_solution,
    clear_all_inputs,
    import_sudoku_from_string,
    export_sudoku_to_string,
    restore_original_board
} from './modules/core.js';

import { 
    create_sudoku_grid
} from './modules/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';

function initializeEventHandlers() {
    const fourGridBtn = document.getElementById('fourGrid');
    const sixGridBtn = document.getElementById('sixGrid');
    const nineGridBtn = document.getElementById('nineGrid');
    const checkSolutionBtn = document.getElementById('checkSolution');
    const checkUniquenessBtn = document.getElementById('checkUniqueness');
    const hideSolutionBtn = document.getElementById('hideSolution');
    const clearAllBtn = document.getElementById('clearAll');

    fourGridBtn.addEventListener('click', () => create_sudoku_grid(4));
    sixGridBtn.addEventListener('click', () => create_sudoku_grid(6));
    nineGridBtn.addEventListener('click', () => create_sudoku_grid(9));
    checkSolutionBtn.addEventListener('click', check_solution);
    checkUniquenessBtn.addEventListener('click', check_candidates_uniqueness);
    hideSolutionBtn.addEventListener('click', restore_original_board);
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    // 默认创建4宫格
    create_sudoku_grid(4);
});