import { initializeEventHandlers } from './modules/eventHandlers.js';
import { create_sudoku_grid } from './modules/classic.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    // 默认创建4宫格
    create_sudoku_grid(4);
});