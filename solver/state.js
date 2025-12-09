// state.js（使用对象包装以允许修改）
export const state = {
    current_mode: null,
    // is_skyscraper_mode: false,
    // is_vx_mode: false,
    current_grid_size: 0,
    is_candidates_mode: false,
    is_solve_mode: false,
    originalBoard: null, // 备份原始题目状态
    isShowingSolution: false, // 是否正在显示答案
    solution: null,
    // solution_Count: 0,
    silentMode: false,
    candidate_elimination_score: {},
    total_score_sum: 0,

    box_missing_subsets: {},
    row_missing_subsets: {},
    col_missing_subsets: {},
    multi_diagonal_lines: [],
    solve_stats: {
        solution_count: 0,
        technique_counts: {},
        total_score: 0,
    },
};

// 设置当前模式(会自动取消其他模式)
export function set_current_mode(mode) {
    if ([
        'classic',
        'skyscraper',
        'VX',
        'kropki',
        'consecutive',
        'candidates',
        'missing',
        'consecutive',
        'diagonal',
        'anti_diagonal',
        'hashtag',
        'multi_diagonal',
        'window',
        'pyramid',
        'extra_region',
        'renban',
        'fortress',
        'exclusion',
        'quadruple',
        'add',
        'product',
        'ratio',
        'inequality',
        'odd',
        'odd_even',
        'isomorphic',
        'anti_king',
        'anti_knight',
        'anti_elephant',
        'palindrome',
        'X_sums',
        'sandwich',
        'new'
    ].includes(mode)) {
        state.current_mode = mode;
    } else {
        state.current_mode = null;
    }
}