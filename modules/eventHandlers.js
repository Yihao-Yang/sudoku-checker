import { 
    check_solution, 
    hide_solution,
    clear_all_inputs,
    // clear_inner_numbers,
    // clear_outer_clues,
    import_sudoku_from_string,
    export_sudoku_to_string
} from './core.js';

import { 
    create_sudoku_grid, 
    check_uniqueness
} from './classic.js';

export function initializeEventHandlers() {
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
    checkUniquenessBtn.addEventListener('click', check_uniqueness);
    hideSolutionBtn.addEventListener('click', hide_solution);
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    // document.getElementById('clearInner').addEventListener('click', clear_inner_numbers);
    // document.getElementById('clearOuter').addEventListener('click', clear_outer_clues);
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
    // document.getElementById('vxSudoku').addEventListener('click', () => create_vx_sudoku(9));
}