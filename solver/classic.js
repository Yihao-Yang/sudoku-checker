import { create_skyscraper_sudoku } from '../modules/skyscraper.js';
import { create_vx_sudoku } from '../modules/vx.js';
import { create_kropki_sudoku } from '../modules/kropki.js';
import { create_candidates_sudoku } from '../modules/candidates.js';
import { create_diagonal_sudoku } from '../modules/diagonal.js';
import { create_anti_diagonal_sudoku } from '../modules/anti_diagonal.js';
import { create_hashtag_sudoku } from '../modules/hashtag.js';
import { create_multi_diagonal_sudoku } from '../modules/multi_diagonal.js';
import { create_consecutive_sudoku } from '../modules/consecutive.js';
import { create_missing_sudoku } from '../modules/missing.js';
import { create_window_sudoku } from '../modules/window.js';
import { create_pyramid_sudoku } from '../modules/pyramid.js';
import { create_isomorphic_sudoku } from '../modules/isomorphic.js';
import { create_extra_region_sudoku } from '../modules/extra_region.js';
import { create_renban_sudoku } from '../modules/renban.js';
import { create_fortress_sudoku } from '../modules/fortress.js';
import { create_clone_sudoku } from '../modules/clone.js';
import { create_anti_king_sudoku } from '../modules/anti_king.js';
import { create_anti_knight_sudoku } from '../modules/anti_knight.js';
import { create_anti_elephant_sudoku } from '../modules/anti_elephant.js';
import { create_exclusion_sudoku, apply_exclusion_marks, is_valid_exclusion } from '../modules/exclusion.js';
import { create_quadruple_sudoku, is_valid_quadruple } from '../modules/quadruple.js';
import { create_add_sudoku } from '../modules/add.js';
import { create_product_sudoku } from '../modules/product.js';
import { create_ratio_sudoku } from '../modules/ratio.js';
import { create_inequality_sudoku } from '../modules/inequality.js';
import { create_odd_sudoku } from '../modules/odd.js';
import { create_odd_even_sudoku, is_valid_odd_even } from '../modules/odd_even.js';
import { create_palindrome_sudoku } from '../modules/palindrome.js';
import { create_X_sums_sudoku } from '../modules/X_sums.js';
import { create_sandwich_sudoku } from '../modules/sandwich.js';
import { create_new_sudoku } from '../modules/new.js';
import { state, set_current_mode } from './state.js';
import { 
    show_result, 
    clear_result, 
    clear_outer_clues, 
    bold_border, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    add_base_input_handlers,
    handle_key_navigation,
    fill_solution,
    log_process,
    backup_original_board,
    change_candidates_mode,
    show_logical_solution
} from './core.js';
import { solve, isValid, eliminate_candidates, invalidate_regions_cache } from './solver_tool.js';

// 最关键的创建数独函数
export function create_sudoku_grid(size) {
    set_current_mode('classic');
    show_result(`当前模式为标准数独`);
    log_process('', true);
    log_process('规则：');
    log_process('行、列、宫内数字均不重复');
    log_process('');
    log_process('操作指引：');
    log_process('1. 先选宫大小，再选变型类型');
    log_process('2. 技巧开关可调整，推荐默认');
    // log_process('1. 优先选择宫的大小再选择相应的变型数独类型');
    // log_process('2. 每个模式下都有默认的技巧开关，可根据需要开启或关闭');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    // log_process('2. 选择变型数独类型后新出现的蓝色"自动出题"按钮是给定变型提示');
    // 重置候选数模式和解题模式按钮及状态
    state.is_candidates_mode = false;
    state.is_solve_mode = false;
    const toggleCandidatesBtn = document.getElementById('toggleCandidatesMode');
    if (toggleCandidatesBtn) toggleCandidatesBtn.textContent = '进入候选数模式';
    const toggleSolveBtn = document.getElementById('toggleSolveMode');
    if (toggleSolveBtn) toggleSolveBtn.textContent = '进入解题模式';
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // // 移除旧的事件监听器
    // const toggleBtn = document.getElementById('toggleCandidatesMode');
    // const newToggleBtn = toggleBtn.cloneNode(true);
    // toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 修改技巧开关 - 关闭不适合缺一门数独的技巧
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        Box_Naked_Triple: true, 
        Row_Col_Naked_Triple: true, 
        Box_Hidden_Triple: true, 
        Row_Col_Hidden_Triple: true, 
        All_Quad: false,         
        Cell_Elimination: true,  
        Brute_Force: false       
    };
    // // 排除法全部默认开启
    // for (let i = 1; i <= size; i++) {
    //     state.techniqueSettings[`Box_Elimination_${i}`] = true;
    // }
    // for (let i = 1; i <= size; i++) {
    //     state.techniqueSettings[`Row_Col_Elimination_${i}`] = true;
    // }
    // // 唯余法全部默认开启
    // for (let i = 1; i <= size; i++) {
    //     state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    // }

    // 创建技巧开关面板
    create_technique_panel();

    // // 添加切换候选数模式按钮事件 (保持原状)
    // document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
    // // 判断当前模式，直接设置状态
    //     if (!state.is_candidates_mode) {
    //         state.is_candidates_mode = true;
    //         change_candidates_mode(inputs, state.current_grid_size, false); // 传true表示强制候选数模式
    //         this.textContent = '退出候选数模式';
    //     } else {
    //         state.is_candidates_mode = false;
    //         change_candidates_mode(inputs, state.current_grid_size, false); // 传false表示退出候选数模式
    //         this.textContent = '进入候选数模式';
    //     }
    // });


    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 创建候选数容器
        const candidates_grid = document.createElement('div');
        candidates_grid.className = 'candidates-grid';
        candidates_grid.style.display = 'none';
        // 设置候选数格子布局（和 classic.js 一样）
        const sub_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
        candidates_grid.style.gridTemplateColumns = `repeat(${sub_size[1]}, 1fr)`;
        candidates_grid.style.gridTemplateRows = `repeat(${sub_size[0]}, 1fr)`;
        for (let n = 1; n <= size; n++) {
            const candidate_cell = document.createElement('div');
            candidate_cell.className = 'candidates-cell';
            candidate_cell.dataset.number = n;
            candidate_cell.textContent = n;
            candidate_cell.style.display = 'none';
            candidate_cell.style.gridArea = get_grid_area(n, sub_size);
            candidates_grid.appendChild(candidate_cell);
        }

        function get_grid_area(number, sub_size) {
            if (size === 6) {
                // 六宫格特殊布局 (2行3列)
                const row = Math.ceil(number / sub_size[1]);
                const col = ((number - 1) % sub_size[1]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            } else {
                // 标准正方形宫格布局
                const row = Math.ceil(number / sub_size[0]);
                const col = ((number - 1) % sub_size[0]) + 1;
                return `${row} / ${col} / ${row} / ${col}`;
            }
        }

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);

        // 存储输入框引用
        inputs[row][col] = main_input;

        // 输入事件处理 (保持原状)
        main_input.addEventListener('input', function() {
            const maxValue = size;
            const regex = new RegExp(`[^1-${maxValue}]`, 'g');
            this.value = this.value.replace(regex, '');
            
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            
            if (state.is_candidates_mode) {
                this.style.display = 'block';
                candidates_grid.style.display = 'grid';

                cell.querySelectorAll('.candidates-cell').forEach(cell => {
                    const num = parseInt(cell.dataset.number);
                    cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
                });
                
                this.value = inputNumbers.join('');
                this.classList.add('hide_input_text'); 
            } else {
                this.style.display = 'block';
                candidates_grid.style.display = 'none';

                if (inputNumbers.length === 1) {
                    this.value = inputNumbers[0];
                } else if (inputNumbers.length === 0) {
                    this.value = '';
                }
            }
        });

        // 点击事件 (保持原状)
        cell.addEventListener('click', function() {
            if (state.is_candidates_mode && main_input.style.display === 'none') {
                main_input.style.display = 'block';
                candidates_grid.style.display = 'none';
                main_input.focus();
                main_input.select();
            }
        });

        // 键盘事件监听 (保持原状)
        main_input.addEventListener('keydown', function(e) {
            if (e.key >= '1' && e.key <= size.toString()) {
                if (state.is_candidates_mode) {
                    e.preventDefault();
                    const num = parseInt(e.key);
                    const currentNumbers = [...new Set(this.value.split('').map(Number))];
                    
                    const newNumbers = currentNumbers.includes(num)
                        ? currentNumbers.filter(n => n !== num)
                        : [...currentNumbers, num].sort((a, b) => a - b);
                    
                    this.value = newNumbers.join('');
                    this.dispatchEvent(new Event('input'));
                } else {
                    if (this.value) {
                        this.value = '';
                    }
                }
            }
            else if (e.key === 'Backspace') {
                if (state.is_candidates_mode && main_input.style.display === 'none') {
                    e.preventDefault();
                    main_input.style.display = 'block';
                    candidates_grid.style.display = 'none';
                    main_input.focus();
                    main_input.select();
                }
            }
            // 使用核心导航函数
            handle_key_navigation(e, row, col, size, inputs);
        });

        // 加粗边框
        bold_border(cell, row, col, size);
        // draw_box_lines(cell, size);

        grid.appendChild(cell);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加额外功能按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';

    if (size === 4) {
        // add_Extra_Button('候选数', () => create_candidates_sudoku(4));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(4));
        // add_Extra_Button('斜井', () => create_hashtag_sudoku(4));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(4));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(4));
        add_Extra_Button('连续', () => create_consecutive_sudoku(4));
        add_Extra_Button('缺一门', () => create_missing_sudoku(4));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(4));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(4));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(4));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(4));
        add_Extra_Button('克隆', () => create_clone_sudoku(4));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(4));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(4));
        add_Extra_Button('排除', () => create_exclusion_sudoku(4));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(4));
        add_Extra_Button('加法', () => create_add_sudoku(4));
        add_Extra_Button('乘积', () => create_product_sudoku(4));
        add_Extra_Button('比例', () => create_ratio_sudoku(4));
        add_Extra_Button('不等号', () => create_inequality_sudoku(4));
        add_Extra_Button('奇数', () => create_odd_sudoku(4));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(4));
        add_Extra_Button('回文', () => create_palindrome_sudoku(4));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(4));
        add_Extra_Button('X和', () => create_X_sums_sudoku(4));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(4));
        add_Extra_Button('新', () => create_new_sudoku(4));
    } else if (size === 6) {
        // add_Extra_Button('候选数', () => create_candidates_sudoku(6));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(6));
        add_Extra_Button('反对角', () => create_anti_diagonal_sudoku(6));
        add_Extra_Button('斜井', () => create_hashtag_sudoku(6));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(6));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(6));
        add_Extra_Button('连续', () => create_consecutive_sudoku(6));
        add_Extra_Button('缺一门', () => create_missing_sudoku(6));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(6));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(6));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(6));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(6));
        add_Extra_Button('克隆', () => create_clone_sudoku(6));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(6));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(6));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(6));
        add_Extra_Button('排除', () => create_exclusion_sudoku(6));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(6));
        add_Extra_Button('加法', () => create_add_sudoku(6));
        add_Extra_Button('乘积', () => create_product_sudoku(6));
        add_Extra_Button('比例', () => create_ratio_sudoku(6));
        add_Extra_Button('不等号', () => create_inequality_sudoku(6));
        add_Extra_Button('奇数', () => create_odd_sudoku(6));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(6));
        add_Extra_Button('回文', () => create_palindrome_sudoku(6));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(6));
        add_Extra_Button('X和', () => create_X_sums_sudoku(6));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(6));
        add_Extra_Button('新', () => create_new_sudoku(6));
    } else if (size === 9) {
        // add_Extra_Button('候选数', () => create_candidates_sudoku(9));
        add_Extra_Button('对角线', () => create_diagonal_sudoku(9));
        add_Extra_Button('反对角', () => create_anti_diagonal_sudoku(9));
        add_Extra_Button('斜井', () => create_hashtag_sudoku(9));
        add_Extra_Button('斜线', () => create_multi_diagonal_sudoku(9));
        add_Extra_Button('VX', () => create_vx_sudoku(9));
        add_Extra_Button('黑白点', () => create_kropki_sudoku(9));
        add_Extra_Button('连续', () => create_consecutive_sudoku(9));
        add_Extra_Button('缺一门', () => create_missing_sudoku(9));
        add_Extra_Button('窗口', () => create_window_sudoku(9));
        add_Extra_Button('金字塔', () => create_pyramid_sudoku(9));
        add_Extra_Button('同位', () => create_isomorphic_sudoku(9));
        add_Extra_Button('额外区域', () => create_extra_region_sudoku(9));
        add_Extra_Button('灰格连续', () => create_renban_sudoku(9));
        add_Extra_Button('堡垒', () => create_fortress_sudoku(9));
        add_Extra_Button('克隆', () => create_clone_sudoku(9));
        add_Extra_Button('无缘', () => create_anti_king_sudoku(9));
        add_Extra_Button('无马', () => create_anti_knight_sudoku(9));
        add_Extra_Button('无象', () => create_anti_elephant_sudoku(9));
        add_Extra_Button('排除', () => create_exclusion_sudoku(9));
        add_Extra_Button('四格提示', () => create_quadruple_sudoku(9));
        add_Extra_Button('加法', () => create_add_sudoku(9));
        add_Extra_Button('乘积', () => create_product_sudoku(9));
        add_Extra_Button('比例', () => create_ratio_sudoku(9));
        add_Extra_Button('不等号', () => create_inequality_sudoku(9));
        add_Extra_Button('奇数', () => create_odd_sudoku(9));
        add_Extra_Button('奇偶', () => create_odd_even_sudoku(9));
        add_Extra_Button('回文', () => create_palindrome_sudoku(9));
        add_Extra_Button('摩天楼', () => create_skyscraper_sudoku(9));
        add_Extra_Button('X和', () => create_X_sums_sudoku(9));
        add_Extra_Button('三明治', () => create_sandwich_sudoku(9));
        add_Extra_Button('新', () => create_new_sudoku(9));
    }
}

// 创建技巧开关面板
export function create_technique_panel() {
    const panel = document.createElement('div');
    panel.id = 'techniquePanel';
    panel.style.position = 'absolute';  // 改为绝对定位
    // panel.style.position = 'fixed';
    panel.style.left = 'calc(50% - 550px)';  // 放在数独容器左侧
    panel.style.top = '350px';  // 与数独容器顶部对齐
    panel.style.width = '200px';
    panel.style.backgroundColor = '#f5f5f5';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    panel.style.zIndex = '1000';

    // 移除旧的技巧面板（如果存在）
    const oldPanel = document.getElementById('techniquePanel');
    if (oldPanel) {
        oldPanel.remove();
    }
    const title = document.createElement('h3');
    title.textContent = '技巧开关';
    title.style.marginTop = '0';
    title.style.fontSize = '18px'; // 确保标题字体大小清晰
    title.style.color = '#333'; // 设置字体颜色为深色
    title.style.textAlign = 'center'; // 居中显示标题
    panel.appendChild(title);

    // 技巧列表
    const techniqueGroups = [
        {
            id: 'elimination',
            name: '排除',
            items: [
                {
                    id: 'Box_Elimination',
                    name: '宫排除',
                    default: true,
                    items: [
                        { id: 'Box_Elimination_1', name: '宫排除_1', default: true },
                        { id: 'Box_Elimination_2', name: '宫排除_2', default: true },
                        { id: 'Box_Elimination_3', name: '宫排除_3', default: true },
                        { id: 'Box_Elimination_4', name: '宫排除_4', default: true },
                        { id: 'Box_Elimination_5', name: '宫排除_5', default: true },
                        { id: 'Box_Elimination_6', name: '宫排除_6', default: true },
                        { id: 'Box_Elimination_7', name: '宫排除_7', default: true },
                        { id: 'Box_Elimination_8', name: '宫排除_8', default: true },
                        { id: 'Box_Elimination_9', name: '宫排除_9', default: true },
                    ]
                },
                {
                    id: 'Row_Col_Elimination',
                    name: '行列排除',
                    default: true,
                    items: [
                        { id: 'Row_Col_Elimination_1', name: '行列排除_1', default: true },
                        { id: 'Row_Col_Elimination_2', name: '行列排除_2', default: true },
                        { id: 'Row_Col_Elimination_3', name: '行列排除_3', default: true },
                        { id: 'Row_Col_Elimination_4', name: '行列排除_4', default: true },
                        { id: 'Row_Col_Elimination_5', name: '行列排除_5', default: true },
                        { id: 'Row_Col_Elimination_6', name: '行列排除_6', default: true },
                        { id: 'Row_Col_Elimination_7', name: '行列排除_7', default: true },
                        { id: 'Row_Col_Elimination_8', name: '行列排除_8', default: true },
                        { id: 'Row_Col_Elimination_9', name: '行列排除_9', default: true },
                    ]
                },
                {
                    id: 'Extra_Region_Elimination',
                    name: '额外区域排除',
                    default: false,
                    items: [
                        { id: 'Extra_Region_Elimination_1', name: '额外区域排除_1', default: false },
                        { id: 'Extra_Region_Elimination_2', name: '额外区域排除_2', default: false },
                        { id: 'Extra_Region_Elimination_3', name: '额外区域排除_3', default: false },
                        { id: 'Extra_Region_Elimination_4', name: '额外区域排除_4', default: false },
                        { id: 'Extra_Region_Elimination_5', name: '额外区域排除_5', default: false },
                        { id: 'Extra_Region_Elimination_6', name: '额外区域排除_6', default: false },
                        { id: 'Extra_Region_Elimination_7', name: '额外区域排除_7', default: false },
                        { id: 'Extra_Region_Elimination_8', name: '额外区域排除_8', default: false },
                        { id: 'Extra_Region_Elimination_9', name: '额外区域排除_9', default: false },
                    ]
                },
            ]
        },
        {
            id: 'block',
            name: '区块',
        items: [
            { id: 'Box_Block', name: '宫区块', default: true },
            { id: 'Variant_Box_Block', name: '变型宫区块', default: false },
            // { id: 'Box_Block_One_Cut', name: '一刀流宫区块', default: true },
            { id: 'Box_Pair_Block', name: '宫组合区块', default: true },
            { id: 'Extra_Region_Pair_Block', name: '额外区域组合区块', default: false },
            { id: 'Row_Col_Block', name: '行列区块', default: true },
            { id: 'Variant_Row_Col_Block', name: '变型行列区块', default: false },
            { id: 'Extra_Region_Block', name: '额外区域区块', default: false },
            { id: 'Variant_Extra_Region_Block', name: '变型额外区域区块', default: false },
            // { id: 'Special_Combination_Region_Block', name: '特定组合区块', default: false }, // 新增特定组合区块
            // { id: 'Multi_Special_Combination_Region_Block', name: '多特定组合区块', default: false } // 新增多特定组合区块
        ]
        },
        {
            id: 'special_combination',
            name: '特定组合',
            items: [
                {
                    id: 'special_combination_must_not_contain',
                    name: '特定组合必不含',
                    items: [
                        { id: 'Special_Combination_Region_Most_Not_Contain_1', name: '特定组合必不含_1', default: false },
                        { id: 'Special_Combination_Region_Most_Not_Contain_2', name: '特定组合必不含_2', default: false },
                        { id: 'Special_Combination_Region_Most_Not_Contain_3', name: '特定组合必不含_3', default: false },
                        { id: 'Special_Combination_Region_Most_Not_Contain_4', name: '特定组合必不含_4', default: false },
                        { id: 'Special_Combination_Region_Most_Not_Contain_n', name: '特定组合必不含_n', default: false },
                    ]
                },
                {
                    id: 'special_combination_must_contain',
                    name: '特定组合必含',
                    items: [
                        { id: 'Special_Combination_Region_Most_Contain_1', name: '特定组合必含_1', default: false },
                        { id: 'Special_Combination_Region_Most_Contain_2', name: '特定组合必含_2', default: false },
                        { id: 'Special_Combination_Region_Most_Contain_3', name: '特定组合必含_3', default: false },
                        { id: 'Special_Combination_Region_Most_Contain_4', name: '特定组合必含_4', default: false },
                        { id: 'Special_Combination_Region_Most_Contain_n', name: '特定组合必含_n', default: false },
                    ]
                },
                {
                    id: 'special_combination_cell_elimination',
                    name: '特定组合唯余',
                    items: [
                        { id: 'Special_Combination_Region_Cell_Elimination_1', name: '特定组合唯余_1', default: false },
                        { id: 'Special_Combination_Region_Cell_Elimination_2', name: '特定组合唯余_2', default: false },
                        { id: 'Special_Combination_Region_Cell_Elimination_3', name: '特定组合唯余_3', default: false },
                        { id: 'Special_Combination_Region_Cell_Elimination_4', name: '特定组合唯余_4', default: false },
                        { id: 'Special_Combination_Region_Cell_Elimination_n', name: '特定组合唯余_n', default: false },
                    ]
                },
                {
                    id: 'special_combination_elimination',
                    name: '特定组合遍历',
                    items: [
                        { id: 'Special_Combination_Region_Elimination_1', name: '特定组合遍历_1', default: false },
                        { id: 'Special_Combination_Region_Elimination_2', name: '特定组合遍历_2', default: false },
                        { id: 'Special_Combination_Region_Elimination_3', name: '特定组合遍历_3', default: false },
                        { id: 'Special_Combination_Region_Elimination_4', name: '特定组合遍历_4', default: false },
                        { id: 'Special_Combination_Region_Elimination_n', name: '特定组合遍历_n', default: false },
                    ]
                },
                {
                    id: 'special_combination_block',
                    name: '特定组合区块',
                    items: [
                        { id: 'Special_Combination_Region_Block_1', name: '特定组合区块_1', default: false },
                        { id: 'Special_Combination_Region_Block_2', name: '特定组合区块_2', default: false },
                        { id: 'Special_Combination_Region_Block_3', name: '特定组合区块_3', default: false },
                        { id: 'Special_Combination_Region_Block_4', name: '特定组合区块_4', default: false },
                        { id: 'Special_Combination_Region_Block_n', name: '特定组合区块_n', default: false },
                    ]
                },
                {
                    id: 'multi_special_combination',
                    name: '多特定组合',
                    items: [
                    {
                        id: 'multi_special_combination_must_not_contain',
                        name: '多特定组合必不含',
                        items: [
                            { id: 'Multi_Special_Combination_Region_Most_Not_Contain_1', name: '多特定组合必不含_1', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Not_Contain_2', name: '多特定组合必不含_2', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Not_Contain_3', name: '多特定组合必不含_3', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Not_Contain_4', name: '多特定组合必不含_4', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Not_Contain_n', name: '多特定组合必不含_n', default: false }
                        ]
                    },
                    {
                        id: 'multi_special_combination_must_contain',
                        name: '多特定组合必含',
                        items: [
                            { id: 'Multi_Special_Combination_Region_Most_Contain_1', name: '多特定组合必含_1', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Contain_2', name: '多特定组合必含_2', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Contain_3', name: '多特定组合必含_3', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Contain_4', name: '多特定组合必含_4', default: false },
                            { id: 'Multi_Special_Combination_Region_Most_Contain_n', name: '多特定组合必含_n', default: false }
                        ]
                    },
                    {
                        id: 'multi_special_combination_cell_elimination',
                        name: '多特定组合唯余',
                        items: [
                            { id: 'Multi_Special_Combination_Region_Cell_Elimination_1', name: '多特定组合唯余_1', default: false },
                            { id: 'Multi_Special_Combination_Region_Cell_Elimination_2', name: '多特定组合唯余_2', default: false },
                            { id: 'Multi_Special_Combination_Region_Cell_Elimination_3', name: '多特定组合唯余_3', default: false },
                            { id: 'Multi_Special_Combination_Region_Cell_Elimination_4', name: '多特定组合唯余_4', default: false },
                            { id: 'Multi_Special_Combination_Region_Cell_Elimination_n', name: '多特定组合唯余_n', default: false }
                        ]
                    },
                    {
                        id: 'multi_special_combination_elimination',
                        name: '多特定组合遍历',
                        items: [
                            { id: 'Multi_Special_Combination_Region_Elimination_1', name: '多特定组合遍历_1', default: false },
                            { id: 'Multi_Special_Combination_Region_Elimination_2', name: '多特定组合遍历_2', default: false },
                            { id: 'Multi_Special_Combination_Region_Elimination_3', name: '多特定组合遍历_3', default: false },
                            { id: 'Multi_Special_Combination_Region_Elimination_4', name: '多特定组合遍历_4', default: false },
                            { id: 'Multi_Special_Combination_Region_Elimination_n', name: '多特定组合遍历_n', default: false }
                        ]
                    },
                    {
                        id: 'multi_special_combination_block',
                        name: '多特定组合区块',
                        items: [
                            { id: 'Multi_Special_Combination_Region_Block_1', name: '多特定组合区块_1', default: false },
                            { id: 'Multi_Special_Combination_Region_Block_2', name: '多特定组合区块_2', default: false },
                            { id: 'Multi_Special_Combination_Region_Block_3', name: '多特定组合区块_3', default: false },
                            { id: 'Multi_Special_Combination_Region_Block_4', name: '多特定组合区块_4', default: false },
                            { id: 'Multi_Special_Combination_Region_Block_n', name: '多特定组合区块_n', default: false }
                        ]
                    }
                    ]
                },
            ]
        },
        {
            id: 'pair',
            name: '数对',
            items: [
                // 隐性数对
                { id: 'Box_Hidden_Pair', name: '宫隐性数对', default: true },
                { id: 'Row_Col_Hidden_Pair', name: '行列隐性数对', default: true },
                { id: 'Extra_Region_Hidden_Pair', name: '额外区域隐性数对', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
                
                // 显性数对
                { id: 'Box_Naked_Pair', name: '宫显性数对', default: true },
                { id: 'Row_Col_Naked_Pair', name: '行列显性数对', default: true },
                { id: 'Extra_Region_Naked_Pair', name: '额外区域显性数对', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
            ]
        },
        {
            id: 'subset',
            name: '数组',
            items: [
                // 隐性三数组
                { id: 'Box_Hidden_Triple', name: '宫隐性三数组', default: true },
                { id: 'Row_Col_Hidden_Triple', name: '行列隐性三数组', default: true },
                { id: 'Extra_Region_Hidden_Triple', name: '额外区域隐性三数组', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
                // 显性三数组
                { id: 'Box_Naked_Triple', name: '宫显性三数组', default: true },
                { id: 'Row_Col_Naked_Triple', name: '行列显性三数组', default: true },
                { id: 'Extra_Region_Naked_Triple', name: '额外区域显性三数组', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
                {
                    id: 'All_Quad',
                    name: '四数组',
                    items: [
                        // 隐性四数组
                        { id: 'Box_Hidden_Quad', name: '宫隐性四数组', default: true },
                        { id: 'Row_Col_Hidden_Quad', name: '行列隐性四数组', default: true },
                        { id: 'Extra_Region_Hidden_Quad', name: '额外区域隐性四数组', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
                        // 显性四数组
                        { id: 'Box_Naked_Quad', name: '宫显性四数组', default: true },
                        { id: 'Row_Col_Naked_Quad', name: '行列显性四数组', default: true },
                        { id: 'Extra_Region_Naked_Quad', name: '额外区域显性四数组', default: state.techniqueSettings?.Extra_Region_Elimination ?? false },
                    ]
                }
            ]
        },
        {
            id: 'cell',
            name: '唯余',
            items: [
                { id: 'Cell_Elimination_1', name: '余1唯余法', default: true },
                { id: 'Cell_Elimination_2', name: '余2唯余法', default: true },
                { id: 'Cell_Elimination_3', name: '余3唯余法', default: true },
                { id: 'Cell_Elimination_4', name: '余4唯余法', default: true },
                { id: 'Cell_Elimination_5', name: '余5唯余法', default: true },
                { id: 'Cell_Elimination_6', name: '余6唯余法', default: true },
                { id: 'Cell_Elimination_7', name: '余7唯余法', default: true },
                { id: 'Cell_Elimination_8', name: '余8唯余法', default: true },
                { id: 'Cell_Elimination_9', name: '余9唯余法', default: true }
            ]
        },
        {
            id: 'bruteForce',
            name: '暴力',
            items: [
                { id: 'Brute_Force', name: '暴力求解', default: false }
            ]
        },
        {
            id: 'missing', // 新增欠一排除分组
            name: '欠一排除',
            items: [
                { id: 'Missing_One', name: '欠一排除', default: state.current_mode === 'missing' }
            ]
        },
        {
            id: 'lookup_table', // 新增打表分组
            name: '打表',
            items: [
                { id: 'Lookup_Table', name: '打表', default: false }
            ]
        }
    ];

    // 初始化技巧状态
    if (!state.techniqueSettings) {
        state.techniqueSettings = {};
        const initializeDefaults = (items) => {
            items.forEach(item => {
                if (item.items) {
                    // 如果是子分组，递归处理
                    initializeDefaults(item.items);
                } else {
                    // 如果是叶子节点，设置默认值
                    state.techniqueSettings[item.id] = item.default;
                }
            });
        };
        techniqueGroups.forEach(group => initializeDefaults(group.items));
    }

    // 新增：检查父级技巧设置并同步子项
    const sync_parent_techniques = () => {
        // 定义父级技巧与其子项的映射关系
        const parent_child_map = {
            'Box_Elimination': ['Box_Elimination_1', 'Box_Elimination_2', 'Box_Elimination_3', 
                                'Box_Elimination_4', 'Box_Elimination_5', 'Box_Elimination_6',
                                'Box_Elimination_7', 'Box_Elimination_8', 'Box_Elimination_9'],
            'Row_Col_Elimination': ['Row_Col_Elimination_1', 'Row_Col_Elimination_2', 'Row_Col_Elimination_3',
                                'Row_Col_Elimination_4', 'Row_Col_Elimination_5', 'Row_Col_Elimination_6',
                                'Row_Col_Elimination_7', 'Row_Col_Elimination_8', 'Row_Col_Elimination_9'],
            'Extra_Region_Elimination': ['Extra_Region_Elimination_1', 'Extra_Region_Elimination_2', 'Extra_Region_Elimination_3',
                                'Extra_Region_Elimination_4', 'Extra_Region_Elimination_5', 'Extra_Region_Elimination_6',
                                'Extra_Region_Elimination_7', 'Extra_Region_Elimination_8', 'Extra_Region_Elimination_9'],
            'Cell_Elimination': ['Cell_Elimination_1', 'Cell_Elimination_2', 'Cell_Elimination_3',
                                'Cell_Elimination_4', 'Cell_Elimination_5', 'Cell_Elimination_6',
                                'Cell_Elimination_7', 'Cell_Elimination_8', 'Cell_Elimination_9']
        };
        
        // 同步父级技巧到子项
        Object.keys(parent_child_map).forEach(parentKey => {
            if (state.techniqueSettings[parentKey] !== undefined) {
                const parentValue = state.techniqueSettings[parentKey];
                parent_child_map[parentKey].forEach(childKey => {
                    state.techniqueSettings[childKey] = parentValue;
                });
            }
        });
    };
    sync_parent_techniques();

    // 递归设置所有子孙节点
    const setAllChildren = (item, value) => {

        // 如果是叶子
        if (!item.items) {
            state.techniqueSettings[item.id] = value;

            const checkbox = document.getElementById(`tech_${item.id}`);
            if (checkbox) {
                checkbox.checked = value;
                checkbox.indeterminate = false;
            }
            return;
        }

        // 如果是中间节点：先递归
        item.items.forEach(child => setAllChildren(child, value));

        // 再更新当前分组自身 checkbox
        const groupCheckbox = document.getElementById(`tech_${item.id}`);
        if (groupCheckbox) {
            groupCheckbox.checked = value;
            groupCheckbox.indeterminate = false;
        }
    };


    // 递归判断是否全选
    const isAllChecked = (items) => {
        return items.every(item => {
            if (item.items) return isAllChecked(item.items);
            return !!state.techniqueSettings[item.id];
        });
    };

    // 递归判断是否全不选
    const isNoneChecked = (items) => {
        return items.every(item => {
            if (item.items) return isNoneChecked(item.items);
            return !state.techniqueSettings[item.id];
        });
    };


    // 渲染技巧面板
    const renderGroupItems = (items, container, updateParentCheckbox) => {
        items.forEach(item => {
            if (item.items) {
                // 子分组
                const subGroupContainer = document.createElement('div');
                subGroupContainer.style.marginBottom = '10px';

                const subGroupTitleContainer = document.createElement('div');
                subGroupTitleContainer.style.display = 'flex';
                subGroupTitleContainer.style.alignItems = 'center';
                subGroupTitleContainer.style.cursor = 'pointer';
                subGroupTitleContainer.style.padding = '5px 0';
                subGroupTitleContainer.style.borderBottom = '1px solid #ccc';

                const subGroupCheckbox = document.createElement('input');
                subGroupCheckbox.type = 'checkbox';
                subGroupCheckbox.style.marginRight = '10px';
                subGroupCheckbox.id = `tech_${item.id}`;

                const updateSubGroupCheckbox = () => {
                    const allChecked = isAllChecked(item.items);
                    const noneChecked = isNoneChecked(item.items);
                    
                    if (allChecked) {
                        subGroupCheckbox.checked = true;
                        subGroupCheckbox.indeterminate = false;
                    } else if (noneChecked) {
                        subGroupCheckbox.checked = false;
                        subGroupCheckbox.indeterminate = false;
                    } else {
                        subGroupCheckbox.checked = false;
                        subGroupCheckbox.indeterminate = true;
                    }
                    if (updateParentCheckbox) updateParentCheckbox();
                };

                updateSubGroupCheckbox();

                subGroupCheckbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const isChecked = subGroupCheckbox.checked;
                    setAllChildren(item, isChecked);

                    updateSubGroupCheckbox();
                    if (updateParentCheckbox) updateParentCheckbox();
                });

                const subGroupTitle = document.createElement('span');
                subGroupTitle.textContent = item.name;
                subGroupTitle.style.fontWeight = 'bold';

                subGroupTitle.addEventListener('click', () => {
                    const isVisible = subGroupItems.style.display === 'block';
                    subGroupItems.style.display = isVisible ? 'none' : 'block';
                });

                subGroupTitleContainer.appendChild(subGroupCheckbox);
                subGroupTitleContainer.appendChild(subGroupTitle);
                subGroupContainer.appendChild(subGroupTitleContainer);

                const subGroupItems = document.createElement('div');
                subGroupItems.style.display = 'none';
                subGroupItems.style.paddingLeft = '20px';

                renderGroupItems(item.items, subGroupItems, updateSubGroupCheckbox);

                subGroupContainer.appendChild(subGroupItems);
                container.appendChild(subGroupContainer);
            } else {
                // 叶子节点
                const div = document.createElement('div');
                div.style.margin = '5px 0';
                div.style.display = 'flex';
                div.style.alignItems = 'center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `tech_${item.id}`;
                checkbox.checked = state.techniqueSettings[item.id];
                checkbox.style.marginRight = '10px';

                checkbox.addEventListener('change', () => {
                    state.techniqueSettings[item.id] = checkbox.checked;
                    if (updateParentCheckbox) updateParentCheckbox();
                });

                const label = document.createElement('label');
                label.htmlFor = `tech_${item.id}`;
                label.textContent = item.name;

                div.appendChild(checkbox);
                div.appendChild(label);
                container.appendChild(div);
            }
        });
    };
    techniqueGroups.forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.style.marginBottom = '10px';

        const groupTitleContainer = document.createElement('div');
        groupTitleContainer.style.display = 'flex';
        groupTitleContainer.style.alignItems = 'center';
        groupTitleContainer.style.cursor = 'pointer';
        groupTitleContainer.style.padding = '5px 0';
        groupTitleContainer.style.borderBottom = '1px solid #ccc';

        const groupCheckbox = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.style.marginRight = '10px';

        const updateGroupCheckbox = () => {
            // 递归检查所有子项的状态
            const checkAllItems = isAllChecked;
            const checkNoneItems = isNoneChecked;

            
            const allChecked = checkAllItems(group.items);
            const noneChecked = checkNoneItems(group.items);
            
            if (allChecked) {
                groupCheckbox.checked = true;
                groupCheckbox.indeterminate = false;
            } else if (noneChecked) {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = false;
            } else {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = true;
            }
        };

        updateGroupCheckbox();

        groupCheckbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const isChecked = groupCheckbox.checked;
            group.items.forEach(item => {
                if (item.items) {
                    setAllChildren(item, isChecked);

                } else {
                    state.techniqueSettings[item.id] = isChecked;
                    const checkbox = document.getElementById(`tech_${item.id}`);
                    if (checkbox) checkbox.checked = isChecked;
                }
            });
            // 同步更新子分组（非叶子）复选框的显示状态
            group.items.forEach(item => {
                if (item.items) {
                    const subGroupCheckbox = document.getElementById(`tech_${item.id}`);
                    if (subGroupCheckbox) {
                        subGroupCheckbox.checked = isChecked;
                        subGroupCheckbox.indeterminate = false;
                    }
                }
            });
            updateGroupCheckbox();
        });

        const groupTitle = document.createElement('span');
        groupTitle.textContent = group.name;
        groupTitle.style.fontWeight = 'bold';

        groupTitle.addEventListener('click', () => {
            const isVisible = groupItems.style.display === 'block';
            groupItems.style.display = isVisible ? 'none' : 'block';
        });

        groupTitleContainer.appendChild(groupCheckbox);
        groupTitleContainer.appendChild(groupTitle);
        groupContainer.appendChild(groupTitleContainer);

        const groupItems = document.createElement('div');
        groupItems.style.display = 'none';
        groupItems.style.paddingLeft = '20px';

        renderGroupItems(group.items, groupItems, updateGroupCheckbox);

        groupContainer.appendChild(groupItems);
        panel.appendChild(groupContainer);
    });

    document.body.appendChild(panel);
    // // 将面板添加到数独容器中而不是body
    // const gridDisplay = document.getElementById('gridDisplay');
    // gridDisplay.appendChild(panel);
    // 添加一个包装容器来保持相对定位
    gridDisplay.style.position = 'relative';
}

/**
 * 验证数独的唯一解
 */
export function check_uniqueness() {
    // 记录开始时间
    const start_time = performance.now();
    // 清空之前的日志
    log_process('', true);
    invalidate_regions_cache();
    state.candidate_elimination_score = {};
    state.total_score_sum = 0;

    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;


    // 备份当前题目状态
    backup_original_board();
    
        // 获取当前数独状态，包括候选数信息
    let board;
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
        board = Array.from({ length: size + 2 }, (_, i) =>
            Array.from({ length: size + 2 }, (_, j) => {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const val = parseInt(input.value);

                if (state.is_candidates_mode && input.value.length > 1) {
                    return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
                }
                return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
            })
        );
    } else {
        board = Array.from({ length: size }, (_, i) =>
            Array.from({ length: size }, (_, j) => {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const val = parseInt(input.value);

                if (state.is_candidates_mode && input.value.length > 1) {
                    return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
                }
                return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
            })
        );
    }
    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
        state.clues_board = Array.from({ length: size + 2 }, (_, i) =>
            Array.from({ length: size + 2 }, (_, j) => {
                const isBorder = i === 0 || i === size + 1 || j === 0 || j === size + 1;
                if (isBorder) {
                    const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                    const valStr = input?.value ?? '';
                    if (state.is_candidates_mode && valStr.length > 1) {
                        return [...new Set(valStr.split('').map(Number))].filter(n => n >= 1 && n <= size);
                    }
                    const v = parseInt(valStr, 10);
                    return Number.isFinite(v) ? v : 0;
                } else {
                    // 内部格子不读取 DOM，只设为完整候选集合
                    return Array.from({ length: size }, (_, n) => n + 1);
                }
            })
        );
    }
    // log_process(
    //     board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );
    // log_process(
    //     state.clues_board
    //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
    //         .join('\n')
    // );

    // 判断当前模式，选择不同的有效性检测函数
    let valid_func = isValid;
    const { solution_count, solution } = solve(board, size, valid_func); // 调用主求解函数
    state.solve_stats.solution_count = solution_count;

    // 记录结束时间
    const end_time = performance.now();
    const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数

    // 显示结果
    if (state.solve_stats.solution_count === -1) {
        show_result(`当前技巧无法解出（用时${elapsed}秒）`);
        show_logical_solution();
    } else if (state.solve_stats.solution_count === 0 || state.solve_stats.solution_count === -2) {
        show_result(`当前数独无解！（用时${elapsed}秒）`);
    } else if (state.solve_stats.solution_count === 1) {
        // 退出候选数模式
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '进入候选数模式';
        
        // 填充唯一解
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    let input;
                    if (state.current_mode === 'X_sums' || state.current_mode === 'sandwich' || state.current_mode === 'skyscraper') {
                        input = container.querySelector(`input[data-row="${i + 1}"][data-col="${j + 1}"]`);
                    } else {
                        input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                    }
                    if (!input) continue; // 防止input未找到
                    const cell = input.parentElement;
                    const candidatesGrid = cell.querySelector('.candidates-grid');

                    // 更新显示状态
                    input.style.display = 'block';
                    input.classList.remove('hide-input-text');
                    if (candidatesGrid) {
                        candidatesGrid.style.display = 'none';
                    }

                    // 填充答案
                    if (solution[i][j] > 0) {
                        // 如果是标准数独模式且该格已有数字，则跳过
                        if (!state.is_candidates_mode && input.value) {
                            continue;
                        }
                        input.value = solution[i][j];
                        input.classList.add("solution-cell");
                    }
                }
            }
        show_result(`当前数独恰好有唯一解！已自动填充答案。（用时${elapsed}秒）`);
    } else if (state.solve_stats.solution_count > 1) {
        show_result(`当前数独有多个解。（用时${elapsed}秒）`);
    } else {
        show_result(`当前数独有${state.solve_stats.solution_count}个解！（用时${elapsed}秒）`);
    }

    // show_logical_solution();
}