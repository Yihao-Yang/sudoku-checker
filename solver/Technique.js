import { state } from './state.js';
import { show_result, log_process, backup_original_board, restore_original_board, } from './core.js';
import { eliminate_candidates, eliminate_candidates_classic, isEqual, getCombinations, getRowLetter, get_all_regions, get_special_combination_regions, isValid } from './solver_tool.js';
import { apply_skyscraper_marks } from '../modules/skyscraper.js';
import { apply_X_sums_marks } from '../modules/X_sums.js';
import { apply_quadruple_marks, is_valid_quadruple } from "../modules/quadruple.js";
import { apply_odd_marks, is_valid_odd } from "../modules/odd.js";
import { apply_odd_even_marks, is_valid_odd_even } from "../modules/odd_even.js";
import { apply_exclusion_marks, is_valid_exclusion } from "../modules/exclusion.js";
import { apply_inequality_marks } from "../modules/inequality.js";
import { apply_thermo_marks } from "../modules/thermo.js";
import { apply_fortress_marks } from "../modules/fortress.js";
import { apply_five_six_marks } from "../modules/five_six.js";
import { apply_full_marks } from "../modules/full.js";
import { get_all_mark_lines, get_cells_on_line } from "../modules/multi_diagonal.js";
// import { is_valid_quadruple } from '../modules/quadruple.js';

function normalize_implicit_numbers(numbers) {
    if (!Array.isArray(numbers)) return undefined;
    return [...new Set(
        numbers
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n))
    )].sort((a, b) => a - b);
}

function clone_implicit_payload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const cloned = {
        ...payload,
        numbers: normalize_implicit_numbers(payload.numbers)
    };
    if (cloned.regionIndex !== undefined && cloned.regionIndex !== null) {
        cloned.regionIndex = String(cloned.regionIndex);
    }
    if (cloned.regionType !== undefined && cloned.regionType !== null) {
        cloned.regionType = String(cloned.regionType);
    }
    if (cloned.kind !== undefined && cloned.kind !== null) {
        cloned.kind = String(cloned.kind);
    }
    if (cloned.subsetSize !== undefined) {
        const subsetSize = Number(cloned.subsetSize);
        if (Number.isFinite(subsetSize)) {
            cloned.subsetSize = subsetSize;
        }
    }
    if (cloned.nat !== undefined) {
        const nat = Number(cloned.nat);
        if (Number.isFinite(nat)) {
            cloned.nat = nat;
        }
    }
    return cloned;
}

function is_implicit_payload_match(expected_payload, actual_payload) {
    if (!expected_payload || typeof expected_payload !== 'object') {
        return true;
    }
    if (!actual_payload || typeof actual_payload !== 'object') {
        return false;
    }

    const expected = clone_implicit_payload(expected_payload);
    const actual = clone_implicit_payload(actual_payload);

    const scalar_keys = ['kind', 'regionType', 'regionIndex', 'subsetSize', 'nat', 'classic', 'axis'];
    for (const key of scalar_keys) {
        if (expected[key] === undefined) continue;
        if (String(expected[key]) !== String(actual[key])) {
            return false;
        }
    }

    if (expected.numbers !== undefined) {
        const expected_numbers = normalize_implicit_numbers(expected.numbers) || [];
        const actual_numbers = normalize_implicit_numbers(actual.numbers) || [];
        if (expected_numbers.length !== actual_numbers.length) {
            return false;
        }
        for (let i = 0; i < expected_numbers.length; i++) {
            if (expected_numbers[i] !== actual_numbers[i]) {
                return false;
            }
        }
    }

    return true;
}

function is_replay_context_allowed(payload) {
    if (!state.implicit_replay_active) {
        return true;
    }
    const expectedTrail = Array.isArray(state.implicit_expected_trail) ? state.implicit_expected_trail : [];
    const cursor = Number(state.implicit_replay_cursor) || 0;
    const expectedEntry = expectedTrail[cursor];
    if (!expectedEntry) {
        return false;
    }
    return is_implicit_payload_match(expectedEntry.payload, payload);
}


export function solve_By_Elimination(board, size) {
    let changed;
    // 添加技巧使用计数器
    const technique_counts = {
        "唯余法_1": 0,
        "唯余法_2": 0,
        "唯余法_3": 0,
        "唯余法_4": 0,
        "唯余法_5": 0,
        "唯余法_6": 0,
        "唯余法_7": 0,
        "唯余法_8": 0,
        "唯余法_9": 0,
        "宫排除_1": 0,
        "宫排除_2": 0,
        "宫排除_3": 0,
        "宫排除_4": 0,
        "宫排除_5": 0,
        "宫排除_6": 0,
        "宫排除_7": 0,
        "宫排除_8": 0,
        "宫排除_9": 0,
        "行列排除_1": 0,
        "行列排除_2": 0,
        "行列排除_3": 0,
        "行列排除_4": 0,
        "行列排除_5": 0,
        "行列排除_6": 0,
        "行列排除_7": 0,
        "行列排除_8": 0,
        "行列排除_9": 0,
        "额外区域排除_1": 0,
        "额外区域排除_2": 0,
        "额外区域排除_3": 0,
        "额外区域排除_4": 0,
        "额外区域排除_5": 0,
        "额外区域排除_6": 0,
        "额外区域排除_7": 0,
        "额外区域排除_8": 0,
        "额外区域排除_9": 0,
        "宫代数_1": 0,
        "宫代数_2": 0,
        "宫代数_3": 0,
        "宫代数_4": 0,
        "宫代数_5": 0,
        "宫代数_6": 0,
        "宫代数_7": 0,
        "宫代数_8": 0,
        "宫代数_9": 0,
        "行列代数_1": 0,
        "行列代数_2": 0,
        "行列代数_3": 0,
        "行列代数_4": 0,
        "行列代数_5": 0,
        "行列代数_6": 0,
        "行列代数_7": 0,
        "行列代数_8": 0,
        "行列代数_9": 0,
        "额外区域代数_1": 0,
        "额外区域代数_2": 0,
        "额外区域代数_3": 0,
        "额外区域代数_4": 0,
        "额外区域代数_5": 0,
        "额外区域代数_6": 0,
        "额外区域代数_7": 0,
        "额外区域代数_8": 0,
        "额外区域代数_9": 0,
        "变型宫代数_1": 0,
        "变型宫代数_2": 0,
        "变型宫代数_3": 0,
        "变型宫代数_4": 0,
        "变型宫代数_5": 0,
        "变型宫代数_6": 0,
        "变型宫代数_7": 0,
        "变型宫代数_8": 0,
        "变型宫代数_9": 0,
        "变型行列代数_1": 0,
        "变型行列代数_2": 0,
        "变型行列代数_3": 0,
        "变型行列代数_4": 0,
        "变型行列代数_5": 0,
        "变型行列代数_6": 0,
        "变型行列代数_7": 0,
        "变型行列代数_8": 0,
        "变型行列代数_9": 0,
        "变型额外区域代数_1": 0,
        "变型额外区域代数_2": 0,
        "变型额外区域代数_3": 0,
        "变型额外区域代数_4": 0,
        "变型额外区域代数_5": 0,
        "变型额外区域代数_6": 0,
        "变型额外区域代数_7": 0,
        "变型额外区域代数_8": 0,
        "变型额外区域代数_9": 0,
        "宫区块_2": 0,
        "宫区块_3": 0,
        "宫区块_4": 0,
        "宫区块_5": 0,
        "宫区块_6": 0,
        "宫区块_7": 0,
        "宫区块_8": 0,
        "宫区块_9": 0,
        "变型宫区块_2": 0,
        "变型宫区块_3": 0,
        "变型宫区块_4": 0,
        "变型宫区块_5": 0,
        "变型宫区块_6": 0,
        "变型宫区块_7": 0,
        "变型宫区块_8": 0,
        "变型宫区块_9": 0,
        "行列区块_2": 0,
        "行列区块_3": 0,
        "行列区块_4": 0,
        "行列区块_5": 0,
        "行列区块_6": 0,
        "行列区块_7": 0,
        "行列区块_8": 0,
        "行列区块_9": 0,
        "变型行列区块_2": 0,
        "变型行列区块_3": 0,
        "变型行列区块_4": 0,
        "变型行列区块_5": 0,
        "变型行列区块_6": 0,
        "变型行列区块_7": 0,
        "变型行列区块_8": 0,
        "变型行列区块_9": 0,
        "额外区域区块_2": 0,
        "额外区域区块_3": 0,
        "额外区域区块_4": 0,
        "额外区域区块_5": 0,
        "额外区域区块_6": 0,
        "额外区域区块_7": 0,
        "额外区域区块_8": 0,
        "额外区域区块_9": 0,
        "变型额外区域区块_2": 0,
        "变型额外区域区块_3": 0,
        "变型额外区域区块_4": 0,
        "变型额外区域区块_5": 0,
        "变型额外区域区块_6": 0,
        "变型额外区域区块_7": 0,
        "变型额外区域区块_8": 0,
        "变型额外区域区块_9": 0,
        "特定组合必不含_1": 0,
        "特定组合必不含_2": 0,
        "特定组合必不含_3": 0,
        "特定组合必不含_4": 0,
        "特定组合必不含_5": 0,
        "特定组合必不含_6": 0,
        "特定组合必不含_7": 0,
        "特定组合必不含_8": 0,
        "特定组合必不含_9": 0,
        "特定组合必不含_n": 0,
        "多特定组合必不含_1": 0,
        "多特定组合必不含_2": 0,
        "多特定组合必不含_3": 0,
        "多特定组合必不含_4": 0,
        "多特定组合必不含_5": 0,
        "多特定组合必不含_6": 0,
        "多特定组合必不含_7": 0,
        "多特定组合必不含_8": 0,
        "多特定组合必不含_9": 0,
        "多特定组合必不含_n": 0,
        "特定组合必含_1": 0,
        "特定组合必含_2": 0,
        "特定组合必含_3": 0,
        "特定组合必含_4": 0,
        "特定组合必含_5": 0,
        "特定组合必含_6": 0,
        "特定组合必含_7": 0,
        "特定组合必含_8": 0,
        "特定组合必含_9": 0,
        "特定组合必含_n": 0,
        "多特定组合必含_1": 0,
        "多特定组合必含_2": 0,
        "多特定组合必含_3": 0,
        "多特定组合必含_4": 0,
        "多特定组合必含_5": 0,
        "多特定组合必含_6": 0,
        "多特定组合必含_7": 0,
        "多特定组合必含_8": 0,
        "多特定组合必含_9": 0,
        "多特定组合必含_n": 0,
        "特定组合遍历_1": 0,
        "特定组合遍历_2": 0,
        "特定组合遍历_3": 0,
        "特定组合遍历_4": 0,
        "特定组合遍历_5": 0,
        "特定组合遍历_6": 0,
        "特定组合遍历_7": 0,
        "特定组合遍历_8": 0,
        "特定组合遍历_9": 0,
        "特定组合遍历_n": 0,
        "多特定组合遍历_1": 0,
        "多特定组合遍历_2": 0,
        "多特定组合遍历_3": 0,
        "多特定组合遍历_4": 0,
        "多特定组合遍历_5": 0,
        "多特定组合遍历_6": 0,
        "多特定组合遍历_7": 0,
        "多特定组合遍历_8": 0,
        "多特定组合遍历_9": 0,
        "多特定组合遍历_n": 0,
        "特定组合唯余_1": 0,
        "特定组合唯余_2": 0,
        "特定组合唯余_3": 0,
        "特定组合唯余_4": 0,
        "特定组合唯余_5": 0,
        "特定组合唯余_6": 0,
        "特定组合唯余_7": 0,
        "特定组合唯余_8": 0,
        "特定组合唯余_9": 0,
        "特定组合唯余_n": 0,
        "多特定组合唯余_1": 0,
        "多特定组合唯余_2": 0,
        "多特定组合唯余_3": 0,
        "多特定组合唯余_4": 0,
        "多特定组合唯余_5": 0,
        "多特定组合唯余_6": 0,
        "多特定组合唯余_7": 0,
        "多特定组合唯余_8": 0,
        "多特定组合唯余_9": 0,
        "多特定组合唯余_n": 0,
        "特定组合区块_1": 0,
        "特定组合区块_2": 0,
        "特定组合区块_3": 0,
        "特定组合区块_4": 0,
        "特定组合区块_5": 0,
        "特定组合区块_6": 0,
        "特定组合区块_7": 0,
        "特定组合区块_8": 0,
        "特定组合区块_9": 0,
        "特定组合区块_n": 0,
        "多特定组合区块_1": 0,
        "多特定组合区块_2": 0,
        "多特定组合区块_3": 0,
        "多特定组合区块_4": 0,
        "多特定组合区块_5": 0,
        "多特定组合区块_6": 0,
        "多特定组合区块_7": 0,
        "多特定组合区块_8": 0,
        "多特定组合区块_9": 0,
        "多特定组合区块_n": 0,
        "一刀流宫排除": 0,
        "一刀流宫区块": 0,
        "宫组合区块": 0,
        "额外区域组合区块": 0,
        "特定组合区块": 0,
        "多特定组合区块": 0,
        "宫显性数对组_2": 0,
        "宫显性数对组_3": 0,
        "宫显性数对组_4": 0,
        "宫显性数对组_5": 0,
        "宫显性数对组_6": 0,
        "宫显性数对组_7": 0,
        "宫显性数对组_8": 0,
        "宫显性数对组_9": 0,
        "行列显性数对组_2": 0,
        "行列显性数对组_3": 0,
        "行列显性数对组_4": 0,
        "行列显性数对组_5": 0,
        "行列显性数对组_6": 0,
        "行列显性数对组_7": 0,
        "行列显性数对组_8": 0,
        "行列显性数对组_9": 0,
        "额外区域显性数对组_2": 0,
        "额外区域显性数对组_3": 0,
        "额外区域显性数对组_4": 0,
        "额外区域显性数对组_5": 0,
        "额外区域显性数对组_6": 0,
        "额外区域显性数对组_7": 0,
        "额外区域显性数对组_8": 0,
        "额外区域显性数对组_9": 0,
        "宫隐性数对组_2": 0,
        "宫隐性数对组_3": 0,
        "宫隐性数对组_4": 0,
        "宫隐性数对组_5": 0,
        "宫隐性数对组_6": 0,
        "宫隐性数对组_7": 0,
        "宫隐性数对组_8": 0,
        "宫隐性数对组_9": 0,
        "行列隐性数对组_2": 0,
        "行列隐性数对组_3": 0,
        "行列隐性数对组_4": 0,
        "行列隐性数对组_5": 0,
        "行列隐性数对组_6": 0,
        "行列隐性数对组_7": 0,
        "行列隐性数对组_8": 0,
        "行列隐性数对组_9": 0,
        "额外区域隐性数对组_2": 0,
        "额外区域隐性数对组_3": 0,
        "额外区域隐性数对组_4": 0,
        "额外区域隐性数对组_5": 0,
        "额外区域隐性数对组_6": 0,
        "额外区域隐性数对组_7": 0,
        "额外区域隐性数对组_8": 0,
        "额外区域隐性数对组_9": 0,
        "打表": 0
    };

    state.implicit_last_application = null;
    if (!Array.isArray(state.implicit_trail)) {
        state.implicit_trail = [];
    }
    if (state.implicit_replay_active) {
        state.implicit_replay_ok = true;
        if (!Array.isArray(state.implicit_expected_trail)) {
            state.implicit_expected_trail = [];
        }
        if (!Number.isFinite(Number(state.implicit_replay_cursor))) {
            state.implicit_replay_cursor = 0;
        }
    }

    let total_score = 0;
    const getTechniqueMultiplier = (scoreKey) => {
        const normalizeMultiplier = (multiplierKey) => {
            const multiplier = Number(state.techniqueScoreMultipliers?.[multiplierKey]);
            return Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
        };

        const exactScoreKeyToMultiplierKey = {
            '宫排除_1': 'Box_Elimination_1',
            '宫排除_2': 'Box_Elimination_2',
            '宫排除_3': 'Box_Elimination_3',
            '宫排除_4': 'Box_Elimination_4',
            '宫排除_5': 'Box_Elimination_5',
            '宫排除_6': 'Box_Elimination_6',
            '宫排除_7': 'Box_Elimination_7',
            '宫排除_8': 'Box_Elimination_8',
            '宫排除_9': 'Box_Elimination_9',
            '行列排除_1': 'Row_Col_Elimination_1',
            '行列排除_2': 'Row_Col_Elimination_2',
            '行列排除_3': 'Row_Col_Elimination_3',
            '行列排除_4': 'Row_Col_Elimination_4',
            '行列排除_5': 'Row_Col_Elimination_5',
            '行列排除_6': 'Row_Col_Elimination_6',
            '行列排除_7': 'Row_Col_Elimination_7',
            '行列排除_8': 'Row_Col_Elimination_8',
            '行列排除_9': 'Row_Col_Elimination_9',
            '额外区域排除_1': 'Extra_Region_Elimination_1',
            '额外区域排除_2': 'Extra_Region_Elimination_2',
            '额外区域排除_3': 'Extra_Region_Elimination_3',
            '额外区域排除_4': 'Extra_Region_Elimination_4',
            '额外区域排除_5': 'Extra_Region_Elimination_5',
            '额外区域排除_6': 'Extra_Region_Elimination_6',
            '额外区域排除_7': 'Extra_Region_Elimination_7',
            '额外区域排除_8': 'Extra_Region_Elimination_8',
            '额外区域排除_9': 'Extra_Region_Elimination_9',
            '宫代数': 'Box_Algebra_1',
            '宫代数_1': 'Box_Algebra_1',
            '宫代数_2': 'Box_Algebra_2',
            '宫代数_3': 'Box_Algebra_3',
            '宫代数_4': 'Box_Algebra_4',
            '宫代数_5': 'Box_Algebra_5',
            '宫代数_6': 'Box_Algebra_6',
            '宫代数_7': 'Box_Algebra_7',
            '宫代数_8': 'Box_Algebra_8',
            '宫代数_9': 'Box_Algebra_9',
            '行列代数': 'Row_Col_Algebra_1',
            '行列代数_1': 'Row_Col_Algebra_1',
            '行列代数_2': 'Row_Col_Algebra_2',
            '行列代数_3': 'Row_Col_Algebra_3',
            '行列代数_4': 'Row_Col_Algebra_4',
            '行列代数_5': 'Row_Col_Algebra_5',
            '行列代数_6': 'Row_Col_Algebra_6',
            '行列代数_7': 'Row_Col_Algebra_7',
            '行列代数_8': 'Row_Col_Algebra_8',
            '行列代数_9': 'Row_Col_Algebra_9',
            '额外区域代数': 'Extra_Region_Algebra_1',
            '额外区域代数_1': 'Extra_Region_Algebra_1',
            '额外区域代数_2': 'Extra_Region_Algebra_2',
            '额外区域代数_3': 'Extra_Region_Algebra_3',
            '额外区域代数_4': 'Extra_Region_Algebra_4',
            '额外区域代数_5': 'Extra_Region_Algebra_5',
            '额外区域代数_6': 'Extra_Region_Algebra_6',
            '额外区域代数_7': 'Extra_Region_Algebra_7',
            '额外区域代数_8': 'Extra_Region_Algebra_8',
            '额外区域代数_9': 'Extra_Region_Algebra_9',
            '变型宫代数': 'Variant_Box_Algebra_1',
            '变型宫代数_1': 'Variant_Box_Algebra_1',
            '变型宫代数_2': 'Variant_Box_Algebra_2',
            '变型宫代数_3': 'Variant_Box_Algebra_3',
            '变型宫代数_4': 'Variant_Box_Algebra_4',
            '变型宫代数_5': 'Variant_Box_Algebra_5',
            '变型宫代数_6': 'Variant_Box_Algebra_6',
            '变型宫代数_7': 'Variant_Box_Algebra_7',
            '变型宫代数_8': 'Variant_Box_Algebra_8',
            '变型宫代数_9': 'Variant_Box_Algebra_9',
            '变型行列代数': 'Variant_Row_Col_Algebra_1',
            '变型行列代数_1': 'Variant_Row_Col_Algebra_1',
            '变型行列代数_2': 'Variant_Row_Col_Algebra_2',
            '变型行列代数_3': 'Variant_Row_Col_Algebra_3',
            '变型行列代数_4': 'Variant_Row_Col_Algebra_4',
            '变型行列代数_5': 'Variant_Row_Col_Algebra_5',
            '变型行列代数_6': 'Variant_Row_Col_Algebra_6',
            '变型行列代数_7': 'Variant_Row_Col_Algebra_7',
            '变型行列代数_8': 'Variant_Row_Col_Algebra_8',
            '变型行列代数_9': 'Variant_Row_Col_Algebra_9',
            '变型额外区域代数': 'Variant_Extra_Region_Algebra_1',
            '变型额外区域代数_1': 'Variant_Extra_Region_Algebra_1',
            '变型额外区域代数_2': 'Variant_Extra_Region_Algebra_2',
            '变型额外区域代数_3': 'Variant_Extra_Region_Algebra_3',
            '变型额外区域代数_4': 'Variant_Extra_Region_Algebra_4',
            '变型额外区域代数_5': 'Variant_Extra_Region_Algebra_5',
            '变型额外区域代数_6': 'Variant_Extra_Region_Algebra_6',
            '变型额外区域代数_7': 'Variant_Extra_Region_Algebra_7',
            '变型额外区域代数_8': 'Variant_Extra_Region_Algebra_8',
            '变型额外区域代数_9': 'Variant_Extra_Region_Algebra_9',
            '宫区块_2': 'Box_Block_2',
            '宫区块_3': 'Box_Block_3',
            '宫区块_4': 'Box_Block_4',
            '宫区块_5': 'Box_Block_5',
            '宫区块_6': 'Box_Block_6',
            '宫区块_7': 'Box_Block_7',
            '宫区块_8': 'Box_Block_8',
            '宫区块_9': 'Box_Block_9',
            '行列区块_2': 'Row_Col_Block_2',
            '行列区块_3': 'Row_Col_Block_3',
            '行列区块_4': 'Row_Col_Block_4',
            '行列区块_5': 'Row_Col_Block_5',
            '行列区块_6': 'Row_Col_Block_6',
            '行列区块_7': 'Row_Col_Block_7',
            '行列区块_8': 'Row_Col_Block_8',
            '行列区块_9': 'Row_Col_Block_9',
            '变型宫区块_2': 'Variant_Box_Block_2',
            '变型宫区块_3': 'Variant_Box_Block_3',
            '变型宫区块_4': 'Variant_Box_Block_4',
            '变型宫区块_5': 'Variant_Box_Block_5',
            '变型宫区块_6': 'Variant_Box_Block_6',
            '变型宫区块_7': 'Variant_Box_Block_7',
            '变型宫区块_8': 'Variant_Box_Block_8',
            '变型宫区块_9': 'Variant_Box_Block_9',
            '变型行列区块_2': 'Variant_Row_Col_Block_2',
            '变型行列区块_3': 'Variant_Row_Col_Block_3',
            '变型行列区块_4': 'Variant_Row_Col_Block_4',
            '变型行列区块_5': 'Variant_Row_Col_Block_5',
            '变型行列区块_6': 'Variant_Row_Col_Block_6',
            '变型行列区块_7': 'Variant_Row_Col_Block_7',
            '变型行列区块_8': 'Variant_Row_Col_Block_8',
            '变型行列区块_9': 'Variant_Row_Col_Block_9',
            '额外区域区块_2': 'Extra_Region_Block_2',
            '额外区域区块_3': 'Extra_Region_Block_3',
            '额外区域区块_4': 'Extra_Region_Block_4',
            '额外区域区块_5': 'Extra_Region_Block_5',
            '额外区域区块_6': 'Extra_Region_Block_6',
            '额外区域区块_7': 'Extra_Region_Block_7',
            '额外区域区块_8': 'Extra_Region_Block_8',
            '额外区域区块_9': 'Extra_Region_Block_9',
            '变型额外区域区块_2': 'Variant_Extra_Region_Block_2',
            '变型额外区域区块_3': 'Variant_Extra_Region_Block_3',
            '变型额外区域区块_4': 'Variant_Extra_Region_Block_4',
            '变型额外区域区块_5': 'Variant_Extra_Region_Block_5',
            '变型额外区域区块_6': 'Variant_Extra_Region_Block_6',
            '变型额外区域区块_7': 'Variant_Extra_Region_Block_7',
            '变型额外区域区块_8': 'Variant_Extra_Region_Block_8',
            '变型额外区域区块_9': 'Variant_Extra_Region_Block_9',
            '宫组合区块': 'Box_Pair_Block',
            '额外区域组合区块': 'Extra_Region_Pair_Block',
            '唯余法_1': 'Cell_Elimination_1',
            '唯余法_2': 'Cell_Elimination_2',
            '唯余法_3': 'Cell_Elimination_3',
            '特定组合必不含_1': 'Special_Combination_Region_Most_Not_Contain_1',
            '特定组合必不含_2': 'Special_Combination_Region_Most_Not_Contain_2',
            '特定组合必不含_3': 'Special_Combination_Region_Most_Not_Contain_3',
            '特定组合必不含_4': 'Special_Combination_Region_Most_Not_Contain_4',
            '特定组合必不含_5': 'Special_Combination_Region_Most_Not_Contain_5',
            '特定组合必不含_6': 'Special_Combination_Region_Most_Not_Contain_6',
            '特定组合必不含_7': 'Special_Combination_Region_Most_Not_Contain_7',
            '特定组合必不含_8': 'Special_Combination_Region_Most_Not_Contain_8',
            '特定组合必不含_9': 'Special_Combination_Region_Most_Not_Contain_9',
            '特定组合必不含_n': 'Special_Combination_Region_Most_Not_Contain_n',
            '特定组合必含_1': 'Special_Combination_Region_Most_Contain_1',
            '特定组合必含_2': 'Special_Combination_Region_Most_Contain_2',
            '特定组合必含_3': 'Special_Combination_Region_Most_Contain_3',
            '特定组合必含_4': 'Special_Combination_Region_Most_Contain_4',
            '特定组合必含_5': 'Special_Combination_Region_Most_Contain_5',
            '特定组合必含_6': 'Special_Combination_Region_Most_Contain_6',
            '特定组合必含_7': 'Special_Combination_Region_Most_Contain_7',
            '特定组合必含_8': 'Special_Combination_Region_Most_Contain_8',
            '特定组合必含_9': 'Special_Combination_Region_Most_Contain_9',
            '特定组合必含_n': 'Special_Combination_Region_Most_Contain_n',
            '特定组合唯余_1': 'Special_Combination_Region_Cell_Elimination_1',
            '特定组合唯余_2': 'Special_Combination_Region_Cell_Elimination_2',
            '特定组合唯余_3': 'Special_Combination_Region_Cell_Elimination_3',
            '特定组合唯余_4': 'Special_Combination_Region_Cell_Elimination_4',
            '特定组合唯余_5': 'Special_Combination_Region_Cell_Elimination_5',
            '特定组合唯余_6': 'Special_Combination_Region_Cell_Elimination_6',
            '特定组合唯余_7': 'Special_Combination_Region_Cell_Elimination_7',
            '特定组合唯余_8': 'Special_Combination_Region_Cell_Elimination_8',
            '特定组合唯余_9': 'Special_Combination_Region_Cell_Elimination_9',
            '特定组合唯余_n': 'Special_Combination_Region_Cell_Elimination_n',
            '特定组合遍历_1': 'Special_Combination_Region_Elimination_1',
            '特定组合遍历_2': 'Special_Combination_Region_Elimination_2',
            '特定组合遍历_3': 'Special_Combination_Region_Elimination_3',
            '特定组合遍历_4': 'Special_Combination_Region_Elimination_4',
            '特定组合遍历_5': 'Special_Combination_Region_Elimination_5',
            '特定组合遍历_6': 'Special_Combination_Region_Elimination_6',
            '特定组合遍历_7': 'Special_Combination_Region_Elimination_7',
            '特定组合遍历_8': 'Special_Combination_Region_Elimination_8',
            '特定组合遍历_9': 'Special_Combination_Region_Elimination_9',
            '特定组合遍历_n': 'Special_Combination_Region_Elimination_n',
            '特定组合区块_1': 'Special_Combination_Region_Block_1',
            '特定组合区块_2': 'Special_Combination_Region_Block_2',
            '特定组合区块_3': 'Special_Combination_Region_Block_3',
            '特定组合区块_4': 'Special_Combination_Region_Block_4',
            '特定组合区块_5': 'Special_Combination_Region_Block_5',
            '特定组合区块_6': 'Special_Combination_Region_Block_6',
            '特定组合区块_7': 'Special_Combination_Region_Block_7',
            '特定组合区块_8': 'Special_Combination_Region_Block_8',
            '特定组合区块_9': 'Special_Combination_Region_Block_9',
            '特定组合区块_n': 'Special_Combination_Region_Block_n',
            '多特定组合必不含_1': 'Multi_Special_Combination_Region_Most_Not_Contain_1',
            '多特定组合必不含_2': 'Multi_Special_Combination_Region_Most_Not_Contain_2',
            '多特定组合必不含_3': 'Multi_Special_Combination_Region_Most_Not_Contain_3',
            '多特定组合必不含_4': 'Multi_Special_Combination_Region_Most_Not_Contain_4',
            '多特定组合必不含_5': 'Multi_Special_Combination_Region_Most_Not_Contain_5',
            '多特定组合必不含_6': 'Multi_Special_Combination_Region_Most_Not_Contain_6',
            '多特定组合必不含_7': 'Multi_Special_Combination_Region_Most_Not_Contain_7',
            '多特定组合必不含_8': 'Multi_Special_Combination_Region_Most_Not_Contain_8',
            '多特定组合必不含_9': 'Multi_Special_Combination_Region_Most_Not_Contain_9',
            '多特定组合必不含_n': 'Multi_Special_Combination_Region_Most_Not_Contain_n',
            '多特定组合必含_1': 'Multi_Special_Combination_Region_Most_Contain_1',
            '多特定组合必含_2': 'Multi_Special_Combination_Region_Most_Contain_2',
            '多特定组合必含_3': 'Multi_Special_Combination_Region_Most_Contain_3',
            '多特定组合必含_4': 'Multi_Special_Combination_Region_Most_Contain_4',
            '多特定组合必含_5': 'Multi_Special_Combination_Region_Most_Contain_5',
            '多特定组合必含_6': 'Multi_Special_Combination_Region_Most_Contain_6',
            '多特定组合必含_7': 'Multi_Special_Combination_Region_Most_Contain_7',
            '多特定组合必含_8': 'Multi_Special_Combination_Region_Most_Contain_8',
            '多特定组合必含_9': 'Multi_Special_Combination_Region_Most_Contain_9',
            '多特定组合必含_n': 'Multi_Special_Combination_Region_Most_Contain_n',
            '多特定组合唯余_1': 'Multi_Special_Combination_Region_Cell_Elimination_1',
            '多特定组合唯余_2': 'Multi_Special_Combination_Region_Cell_Elimination_2',
            '多特定组合唯余_3': 'Multi_Special_Combination_Region_Cell_Elimination_3',
            '多特定组合唯余_4': 'Multi_Special_Combination_Region_Cell_Elimination_4',
            '多特定组合唯余_5': 'Multi_Special_Combination_Region_Cell_Elimination_5',
            '多特定组合唯余_6': 'Multi_Special_Combination_Region_Cell_Elimination_6',
            '多特定组合唯余_7': 'Multi_Special_Combination_Region_Cell_Elimination_7',
            '多特定组合唯余_8': 'Multi_Special_Combination_Region_Cell_Elimination_8',
            '多特定组合唯余_9': 'Multi_Special_Combination_Region_Cell_Elimination_9',
            '多特定组合唯余_n': 'Multi_Special_Combination_Region_Cell_Elimination_n',
            '多特定组合遍历_1': 'Multi_Special_Combination_Region_Elimination_1',
            '多特定组合遍历_2': 'Multi_Special_Combination_Region_Elimination_2',
            '多特定组合遍历_3': 'Multi_Special_Combination_Region_Elimination_3',
            '多特定组合遍历_4': 'Multi_Special_Combination_Region_Elimination_4',
            '多特定组合遍历_5': 'Multi_Special_Combination_Region_Elimination_5',
            '多特定组合遍历_6': 'Multi_Special_Combination_Region_Elimination_6',
            '多特定组合遍历_7': 'Multi_Special_Combination_Region_Elimination_7',
            '多特定组合遍历_8': 'Multi_Special_Combination_Region_Elimination_8',
            '多特定组合遍历_9': 'Multi_Special_Combination_Region_Elimination_9',
            '多特定组合遍历_n': 'Multi_Special_Combination_Region_Elimination_n',
            '多特定组合区块_1': 'Multi_Special_Combination_Region_Block_1',
            '多特定组合区块_2': 'Multi_Special_Combination_Region_Block_2',
            '多特定组合区块_3': 'Multi_Special_Combination_Region_Block_3',
            '多特定组合区块_4': 'Multi_Special_Combination_Region_Block_4',
            '多特定组合区块_5': 'Multi_Special_Combination_Region_Block_5',
            '多特定组合区块_6': 'Multi_Special_Combination_Region_Block_6',
            '多特定组合区块_7': 'Multi_Special_Combination_Region_Block_7',
            '多特定组合区块_8': 'Multi_Special_Combination_Region_Block_8',
            '多特定组合区块_9': 'Multi_Special_Combination_Region_Block_9',
            '多特定组合区块_n': 'Multi_Special_Combination_Region_Block_n',
            '唯余法_4': 'Cell_Elimination_4',
            '唯余法_5': 'Cell_Elimination_5',
            '唯余法_6': 'Cell_Elimination_6',
            '唯余法_7': 'Cell_Elimination_7',
            '唯余法_8': 'Cell_Elimination_8',
            '唯余法_9': 'Cell_Elimination_9',
        };

        const prefixScoreKeyToMultiplierKey = {
            '宫排除_': 'Box_Elimination',
            '行列排除_': 'Row_Col_Elimination',
            '额外区域排除_': 'Extra_Region_Elimination',
            '宫代数_': 'Box_Algebra',
            '行列代数_': 'Row_Col_Algebra',
            '额外区域代数_': 'Extra_Region_Algebra',
            '变型宫代数_': 'Variant_Box_Algebra',
            '变型行列代数_': 'Variant_Row_Col_Algebra',
            '变型额外区域代数_': 'Variant_Extra_Region_Algebra',
            '宫区块_': 'Box_Block',
            '行列区块_': 'Row_Col_Block',
            '变型宫区块_': 'Variant_Box_Block',
            '变型行列区块_': 'Variant_Row_Col_Block',
            '额外区域区块_': 'Extra_Region_Block',
            '变型额外区域区块_': 'Variant_Extra_Region_Block',
            '特定组合必不含_': 'special_combination_must_not_contain',
            '特定组合必含_': 'special_combination_must_contain',
            '特定组合唯余_': 'special_combination_cell_elimination',
            '特定组合遍历_': 'special_combination_elimination',
            '特定组合区块_': 'special_combination_block',
            '多特定组合必不含_': 'multi_special_combination',
            '多特定组合必含_': 'multi_special_combination',
            '多特定组合唯余_': 'multi_special_combination',
            '多特定组合遍历_': 'multi_special_combination',
            '多特定组合区块_': 'multi_special_combination',
            'Box_Hidden_': 'Box_Hidden',
            'Row_Col_Hidden_': 'Row_Col_Hidden',
            'Extra_Region_Hidden_': 'Extra_Region_Hidden',
            'Box_Naked_': 'Box_Naked',
            'Row_Col_Naked_': 'Row_Col_Naked',
            'Extra_Region_Naked_': 'Extra_Region_Naked',
        };

        let multiplier = 1;
        const exactMultiplierKey = exactScoreKeyToMultiplierKey[scoreKey];
        if (exactMultiplierKey) {
            multiplier *= normalizeMultiplier(exactMultiplierKey);
        }

        const matchedPrefix = Object.keys(prefixScoreKeyToMultiplierKey).find((prefix) => scoreKey.startsWith(prefix));
        if (matchedPrefix) {
            const prefixMultiplierKey = prefixScoreKeyToMultiplierKey[matchedPrefix];
            if (prefixMultiplierKey !== exactMultiplierKey) {
                multiplier *= normalizeMultiplier(prefixMultiplierKey);
            }
            if (!exactMultiplierKey) {
                multiplier *= normalizeMultiplier(scoreKey);
            }
        }

        if (!exactMultiplierKey && !matchedPrefix) {
            multiplier *= normalizeMultiplier(scoreKey);
        }

        return multiplier;
    };

    const hasNewSolvedCellAfterTechnique = (beforeBoard, afterBoard) => {
        for (let r = 0; r < beforeBoard.length; r++) {
            for (let c = 0; c < beforeBoard[r].length; c++) {
                const beforeCell = beforeBoard[r][c];
                const afterCell = afterBoard[r][c];
                if (Array.isArray(beforeCell) && typeof afterCell === 'number' && afterCell > 0) {
                    return true;
                }
            }
        }
        return false;
    };

    // 按需缓存每个技巧分值（底层初始分为1，实际分值由倍率给出）。
    const technique_scores = {};
    const getTechniqueScore = (scoreKey) => {
        if (!scoreKey) {
            return 0;
        }
        if (technique_scores[scoreKey] === undefined) {
            technique_scores[scoreKey] = getTechniqueMultiplier(scoreKey);
        }
        return technique_scores[scoreKey];
    };

    const resolveTechniqueMeta = (technique) => {
        const technique_name = technique.technique_name || technique.toString().match(/state\.techniqueSettings\?\.(\w+)/)?.[1];
        const natRaw = technique.nat || technique.toString().match(/check_\w+\(([^,]+),\s*[^,]+,\s*(\d+)/)?.[2];
        const nat = Number.isFinite(Number(natRaw)) ? Number(natRaw) : natRaw;

        if (!technique_name) {
            return { technique_name: null, nat: null, chinese_name: null, score_key: null };
        }

        const directBlockTechniqueMap = {
            Box_Block: '宫区块',
            Variant_Box_Block: '变型宫区块',
            Row_Col_Block: '行列区块',
            Variant_Row_Col_Block: '变型行列区块',
            Extra_Region_Block: '额外区域区块',
            Variant_Extra_Region_Block: '变型额外区域区块'
        };

        const directBlockTechniqueMatch = technique_name.match(/^(Box_Block|Variant_Box_Block|Row_Col_Block|Variant_Row_Col_Block|Extra_Region_Block|Variant_Extra_Region_Block)_(\d+)$/);
        const dynamicSubsetTechniqueMatch = technique_name.match(/^(Box|Row_Col|Extra_Region)_(Hidden|Naked)_(Pair|Triple|Quad|\d+)$/);
        let chinese_name = null;
        let score_key = null;

        if (technique_name.startsWith('Cell_Elimination_')) {
            chinese_name = `唯余法_${technique_name.split('_')[2]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Box_Elimination_')) {
            chinese_name = `宫排除_${technique_name.split('_')[2]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Row_Col_Elimination_')) {
            chinese_name = `行列排除_${technique_name.split('_')[3]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Extra_Region_Elimination_')) {
            chinese_name = `额外区域排除_${technique_name.split('_')[3]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Special_Combination_Region_Most_Not_Contain_')) {
            chinese_name = `特定组合必不含_${technique_name.split('_')[6]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Multi_Special_Combination_Region_Most_Not_Contain_')) {
            chinese_name = `多特定组合必不含_${technique_name.split('_')[7]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Special_Combination_Region_Most_Contain_')) {
            chinese_name = `特定组合必含_${technique_name.split('_')[5]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Multi_Special_Combination_Region_Most_Contain_')) {
            chinese_name = `多特定组合必含_${technique_name.split('_')[6]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Special_Combination_Region_Elimination_')) {
            chinese_name = `特定组合遍历_${technique_name.split('_')[4]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Multi_Special_Combination_Region_Elimination_')) {
            chinese_name = `多特定组合遍历_${technique_name.split('_')[5]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Special_Combination_Region_Cell_Elimination_')) {
            chinese_name = `特定组合唯余_${technique_name.split('_')[5]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Multi_Special_Combination_Region_Cell_Elimination_')) {
            chinese_name = `多特定组合唯余_${technique_name.split('_')[6]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Special_Combination_Region_Block_')) {
            chinese_name = `特定组合区块_${technique_name.split('_')[4]}`;
            score_key = chinese_name;
        } else if (technique_name.startsWith('Multi_Special_Combination_Region_Block_')) {
            chinese_name = `多特定组合区块_${technique_name.split('_')[5]}`;
            score_key = chinese_name;
        } else if (directBlockTechniqueMatch) {
            const [, blockType, blockSize] = directBlockTechniqueMatch;
            chinese_name = `${directBlockTechniqueMap[blockType]}_${blockSize}`;
            score_key = chinese_name;
        } else if (dynamicSubsetTechniqueMatch) {
            const [, regionScope, subsetType, subsetToken] = dynamicSubsetTechniqueMatch;
            const regionNameMap = {
                Box: '宫',
                Row_Col: '行列',
                Extra_Region: '额外区域'
            };
            const subsetTypeMap = {
                Hidden: '隐性',
                Naked: '显性'
            };
            const subsetSizeMap = {
                Pair: '2',
                Triple: '3',
                Quad: '4'
            };
            const subsetSize = subsetSizeMap[subsetToken] || subsetToken;
            chinese_name = `${regionNameMap[regionScope]}${subsetTypeMap[subsetType]}数对组_${subsetSize}`;
            score_key = technique_name;
        } else {
            switch (technique_name) {
                case 'Box_One_Cut':
                    chinese_name = '一刀流宫排除';
                    score_key = chinese_name;
                    break;
                case 'Box_Block':
                    chinese_name = `宫区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Block':
                    chinese_name = `变型宫区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Box_Block_One_Cut':
                    chinese_name = '一刀流宫区块';
                    score_key = chinese_name;
                    break;
                case 'Box_Pair_Block':
                    chinese_name = '宫组合区块';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Pair_Block':
                    chinese_name = '额外区域组合区块';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Block':
                    chinese_name = `行列区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Block':
                    chinese_name = `变型行列区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Block':
                    chinese_name = `额外区域区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Block':
                    chinese_name = `变型额外区域区块_${nat}`;
                    score_key = chinese_name;
                    break;
                case 'Lookup_Table':
                    chinese_name = '打表';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra':
                case 'Box_Algebra_1':
                    chinese_name = '宫代数_1';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_2':
                    chinese_name = '宫代数_2';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_3':
                    chinese_name = '宫代数_3';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_4':
                    chinese_name = '宫代数_4';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_5':
                    chinese_name = '宫代数_5';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_6':
                    chinese_name = '宫代数_6';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_7':
                    chinese_name = '宫代数_7';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_8':
                    chinese_name = '宫代数_8';
                    score_key = chinese_name;
                    break;
                case 'Box_Algebra_9':
                    chinese_name = '宫代数_9';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra':
                case 'Row_Col_Algebra_1':
                    chinese_name = '行列代数_1';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_2':
                    chinese_name = '行列代数_2';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_3':
                    chinese_name = '行列代数_3';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_4':
                    chinese_name = '行列代数_4';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_5':
                    chinese_name = '行列代数_5';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_6':
                    chinese_name = '行列代数_6';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_7':
                    chinese_name = '行列代数_7';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_8':
                    chinese_name = '行列代数_8';
                    score_key = chinese_name;
                    break;
                case 'Row_Col_Algebra_9':
                    chinese_name = '行列代数_9';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra':
                case 'Extra_Region_Algebra_1':
                    chinese_name = '额外区域代数_1';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_2':
                    chinese_name = '额外区域代数_2';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_3':
                    chinese_name = '额外区域代数_3';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_4':
                    chinese_name = '额外区域代数_4';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_5':
                    chinese_name = '额外区域代数_5';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_6':
                    chinese_name = '额外区域代数_6';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_7':
                    chinese_name = '额外区域代数_7';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_8':
                    chinese_name = '额外区域代数_8';
                    score_key = chinese_name;
                    break;
                case 'Extra_Region_Algebra_9':
                    chinese_name = '额外区域代数_9';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra':
                case 'Variant_Box_Algebra_1':
                    chinese_name = '变型宫代数_1';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_2':
                    chinese_name = '变型宫代数_2';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_3':
                    chinese_name = '变型宫代数_3';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_4':
                    chinese_name = '变型宫代数_4';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_5':
                    chinese_name = '变型宫代数_5';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_6':
                    chinese_name = '变型宫代数_6';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_7':
                    chinese_name = '变型宫代数_7';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_8':
                    chinese_name = '变型宫代数_8';
                    score_key = chinese_name;
                    break;
                case 'Variant_Box_Algebra_9':
                    chinese_name = '变型宫代数_9';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra':
                case 'Variant_Row_Col_Algebra_1':
                    chinese_name = '变型行列代数_1';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_2':
                    chinese_name = '变型行列代数_2';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_3':
                    chinese_name = '变型行列代数_3';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_4':
                    chinese_name = '变型行列代数_4';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_5':
                    chinese_name = '变型行列代数_5';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_6':
                    chinese_name = '变型行列代数_6';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_7':
                    chinese_name = '变型行列代数_7';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_8':
                    chinese_name = '变型行列代数_8';
                    score_key = chinese_name;
                    break;
                case 'Variant_Row_Col_Algebra_9':
                    chinese_name = '变型行列代数_9';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra':
                case 'Variant_Extra_Region_Algebra_1':
                    chinese_name = '变型额外区域代数_1';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_2':
                    chinese_name = '变型额外区域代数_2';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_3':
                    chinese_name = '变型额外区域代数_3';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_4':
                    chinese_name = '变型额外区域代数_4';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_5':
                    chinese_name = '变型额外区域代数_5';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_6':
                    chinese_name = '变型额外区域代数_6';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_7':
                    chinese_name = '变型额外区域代数_7';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_8':
                    chinese_name = '变型额外区域代数_8';
                    score_key = chinese_name;
                    break;
                case 'Variant_Extra_Region_Algebra_9':
                    chinese_name = '变型额外区域代数_9';
                    score_key = chinese_name;
                    break;
                default:
                    chinese_name = null;
                    score_key = null;
            }
        }

        return { technique_name, nat, chinese_name, score_key };
    };

    const techniqueGroups = [
        // ==================== 第一优先级组（基础排除）====================
        // 打表法
        [() => state.techniqueSettings?.Lookup_Table && check_lookup_table(board, size)],
        // 唯余法_1
        [() => state.techniqueSettings?.Cell_Elimination_1 && check_cell_elimination(board, size, 1)],
        // 宫排除_1
        [() => state.techniqueSettings?.Box_Elimination_1 && check_Box_Elimination(board, size, 1)],
        // 额外区域排除_1
        [() => state.techniqueSettings?.Extra_Region_Elimination_1 && check_Extra_Region_Elimination(board, size, 1)],
        // 行列排除_1
        [() => state.techniqueSettings?.Row_Col_Elimination_1 && check_row_col_elimination(board, size, 1)],
        // 特定组合唯余_1
        [() => state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_1 && check_special_combination_region_cell_elimination(board, size, 1)],
        // 特定组合必含_1
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Contain_1 && check_special_combination_region_must_contain(board, size, 1)],
        // 特定组合必不含_1
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_1 && check_special_combination_region_must_not_contain(board, size, 1)],
        // 特定组合遍历_1
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_1 && check_special_combination_region_elimination(board, size, 1)],


        // 唯余法_2
        [() => state.techniqueSettings?.Cell_Elimination_2 && check_cell_elimination(board, size, 2)],
        // 宫排除_2  
        [() => state.techniqueSettings?.Box_Elimination_2 && check_Box_Elimination(board, size, 2)],
        // 宫排除_3
        [() => state.techniqueSettings?.Box_Elimination_3 && check_Box_Elimination(board, size, 3)],
        // 宫排除_4
        [() => state.techniqueSettings?.Box_Elimination_4 && check_Box_Elimination(board, size, 4)],
        // 宫排除_5
        [() => state.techniqueSettings?.Box_Elimination_5 && check_Box_Elimination(board, size, 5)],
        // 宫排除_6
        [() => state.techniqueSettings?.Box_Elimination_6 && check_Box_Elimination(board, size, 6)],
        // 宫排除_7
        [() => state.techniqueSettings?.Box_Elimination_7 && check_Box_Elimination(board, size, 7)],
        // 宫排除_8
        [() => state.techniqueSettings?.Box_Elimination_8 && check_Box_Elimination(board, size, 8)],
        // 宫排除_9
        [() => state.techniqueSettings?.Box_Elimination_9 && check_Box_Elimination(board, size, 9)],
        // 一刀流宫排除
        [() => state.techniqueSettings?.Box_One_Cut && check_Box_Elimination_One_Cut(board, size)],
        // 额外区域排除_2
        [() => state.techniqueSettings?.Extra_Region_Elimination_2 && check_Extra_Region_Elimination(board, size, 2)],
        // 额外区域排除_3
        [() => state.techniqueSettings?.Extra_Region_Elimination_3 && check_Extra_Region_Elimination(board, size, 3)],
        // 额外区域排除_4
        [() => state.techniqueSettings?.Extra_Region_Elimination_4 && check_Extra_Region_Elimination(board, size, 4)],
        // 额外区域排除_5
        [() => state.techniqueSettings?.Extra_Region_Elimination_5 && check_Extra_Region_Elimination(board, size, 5)],
        // 额外区域排除_6
        [() => state.techniqueSettings?.Extra_Region_Elimination_6 && check_Extra_Region_Elimination(board, size, 6)],
        // 额外区域排除_7
        [() => state.techniqueSettings?.Extra_Region_Elimination_7 && check_Extra_Region_Elimination(board, size, 7)],
        // 额外区域排除_8
        [() => state.techniqueSettings?.Extra_Region_Elimination_8 && check_Extra_Region_Elimination(board, size, 8)],
        // 额外区域排除_9
        [() => state.techniqueSettings?.Extra_Region_Elimination_9 && check_Extra_Region_Elimination(board, size, 9)],
        // 特定组合唯余_2
        [() => state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_2 && check_special_combination_region_cell_elimination(board, size, 2)],
        // 特定组合必含_2
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Contain_2 && check_special_combination_region_must_contain(board, size, 2)],
        // 特定组合必不含_2
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_2 && check_special_combination_region_must_not_contain(board, size, 2)],
        // 特定组合遍历_2
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_2 && check_special_combination_region_elimination(board, size, 2)],


        // 唯余法_3
        [() => state.techniqueSettings?.Cell_Elimination_3 && check_cell_elimination(board, size, 3)],
        // 行列排除_2-3
        [() => state.techniqueSettings?.Row_Col_Elimination_2 && check_row_col_elimination(board, size, 2)],
        [() => state.techniqueSettings?.Row_Col_Elimination_3 && check_row_col_elimination(board, size, 3)],




        
        

        // ==================== 第二优先级组（区块类）====================
        // 宫区块_2-3
        ...Array.from({length: Math.max(0, Math.min(size, 3) - 1)}, (_, i) => {
            const nat = i + 2;
            const f = () => (state.techniqueSettings?.[`Box_Block_${nat}`] ?? state.techniqueSettings?.Box_Block) && check_box_block_elimination(board, size, nat, true);
            f.nat = nat;
            f.technique_name = 'Box_Block';
            return [f];
        }),
        // 宫区块_4-size
        ...Array.from({length: Math.max(0, size - 3)}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Box_Block_${nat}`] ?? state.techniqueSettings?.Box_Block) && check_box_block_elimination(board, size, nat, true);
            f.nat = nat;
            f.technique_name = 'Box_Block';
            return [f];
        }),
        // 一刀流宫区块
        [() => state.techniqueSettings?.Box_Block_One_Cut && check_box_block_elimination_One_Cut(board, size)],
        // 唯余法_4 + 行列排除_4
        [() => state.techniqueSettings?.Cell_Elimination_4 && check_cell_elimination(board, size, 4)],
        [() => state.techniqueSettings?.Row_Col_Elimination_4 && check_row_col_elimination(board, size, 4)],
        // 变型宫区块_2
        [() => (state.techniqueSettings?.Variant_Box_Block_2 ?? state.techniqueSettings?.Variant_Box_Block) && check_box_block_elimination(board, size, 2, false)],
        // 额外区域区块_2
        [() => (state.techniqueSettings?.Extra_Region_Block_2 ?? state.techniqueSettings?.Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, 2, true)],
        // 变型额外区域区块_2
        [() => (state.techniqueSettings?.Variant_Extra_Region_Block_2 ?? state.techniqueSettings?.Variant_Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, 2, false)],
        // 特定组合区块_1
        [() => state.techniqueSettings?.Special_Combination_Region_Block_1 && check_special_combination_region_block_elimination(board, size, 1)],
        // 特定组合区块_2
        [() => state.techniqueSettings?.Special_Combination_Region_Block_2 && check_special_combination_region_block_elimination(board, size, 2)],

        // 变型宫区块_3
        [() => (state.techniqueSettings?.Variant_Box_Block_3 ?? state.techniqueSettings?.Variant_Box_Block) && check_box_block_elimination(board, size, 3, false)],
        // 额外区域区块_3
        [() => (state.techniqueSettings?.Extra_Region_Block_3 ?? state.techniqueSettings?.Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, 3, true)],
        // 额外区域区块_4-size
        ...Array.from({length: Math.max(0, size - 3)}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Extra_Region_Block_${nat}`] ?? state.techniqueSettings?.Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, nat, true);
            f.nat = nat;
            f.technique_name = 'Extra_Region_Block';
            return [f];
        }),
        // 变型额外区域区块_3
        [() => (state.techniqueSettings?.Variant_Extra_Region_Block_3 ?? state.techniqueSettings?.Variant_Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, 3, false)],
        // 特定组合唯余_3
        [() => state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_3 && check_special_combination_region_cell_elimination(board, size, 3)],
        // 特定组合必含_3
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Contain_3 && check_special_combination_region_must_contain(board, size, 3)],

        // 特定组合必不含_3
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_3 && check_special_combination_region_must_not_contain(board, size, 3)],
        // 特定组合区块_3
        [() => state.techniqueSettings?.Special_Combination_Region_Block_3 && check_special_combination_region_block_elimination(board, size, 3)],


        // 宫组合区块
        [() => state.techniqueSettings?.Box_Pair_Block && check_box_pair_block_elimination(board, size)],
        // 唯余法_5 + 行列排除_5
        [() => state.techniqueSettings?.Cell_Elimination_5 && check_cell_elimination(board, size, 5)],
        [() => state.techniqueSettings?.Row_Col_Elimination_5 && check_row_col_elimination(board, size, 5)],
        // 额外区域组合区块
        [() => state.current_mode !== 'classic' && state.techniqueSettings?.Extra_Region_Pair_Block && check_extra_region_pair_block_elimination(board, size)],
        // 行列区块_2-3
        ...Array.from({length: Math.max(0, Math.min(size, 3) - 1)}, (_, i) => {
            const nat = i + 2;
            const f = () => (state.techniqueSettings?.[`Row_Col_Block_${nat}`] ?? state.techniqueSettings?.Row_Col_Block) && check_Row_Col_Block_Elimination(board, size, nat, true);
            f.nat = nat;
            f.technique_name = 'Row_Col_Block';
            return [f];
        }),
        // 行列区块_4-size
        ...Array.from({length: Math.max(0, size - 3)}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Row_Col_Block_${nat}`] ?? state.techniqueSettings?.Row_Col_Block) && check_Row_Col_Block_Elimination(board, size, nat, true);
            f.nat = nat;
            f.technique_name = 'Row_Col_Block';
            return [f];
        }),
        // 变型行列区块_2
        [() => (state.techniqueSettings?.Variant_Row_Col_Block_2 ?? state.techniqueSettings?.Variant_Row_Col_Block) && check_Row_Col_Block_Elimination(board, size, 2, false)],


        // ==================== 第三优先级组（数对组_2 + 高级排除）====================
        // 宫隐性数对组_2
        [() => (state.techniqueSettings?.Box_Hidden_2 ?? state.techniqueSettings?.Box_Hidden_Pair) && check_box_hidden_subset_elimination(board, size, 2)],
        // 额外区域隐性数对组_2
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Hidden_2 ?? state.techniqueSettings?.Extra_Region_Hidden_Pair) && check_extra_region_hidden_subset_elimination(board, size, 2)],
        // 唯余法_6-9 + 行列排除_6-9
        [() => state.techniqueSettings?.Cell_Elimination_6 && check_cell_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Row_Col_Elimination_6 && check_row_col_elimination(board, size, 6)],
        [() => state.techniqueSettings?.Cell_Elimination_7 && check_cell_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Row_Col_Elimination_7 && check_row_col_elimination(board, size, 7)],
        [() => state.techniqueSettings?.Cell_Elimination_8 && check_cell_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Row_Col_Elimination_8 && check_row_col_elimination(board, size, 8)],
        [() => state.techniqueSettings?.Cell_Elimination_9 && check_cell_elimination(board, size, 9)],
        [() => state.techniqueSettings?.Row_Col_Elimination_9 && check_row_col_elimination(board, size, 9)],

        // 变型行列区块_3
        [() => (state.techniqueSettings?.Variant_Row_Col_Block_3 ?? state.techniqueSettings?.Variant_Row_Col_Block) && check_Row_Col_Block_Elimination(board, size, 3, false)],
        // 特定组合遍历_3
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_3 && check_special_combination_region_elimination(board, size, 3)],
        
        // 宫代数_1
        [() => (state.techniqueSettings?.Box_Algebra_1 ?? state.techniqueSettings?.Box_Algebra) && check_box_algebra_elimination_level1(board, size)],
        // 额外区域代数_1
        [() => (state.techniqueSettings?.Extra_Region_Algebra_1 ?? state.techniqueSettings?.Extra_Region_Algebra) && check_extra_region_algebra_elimination_level1(board, size)],
        // 变型宫代数_1
        [() => (state.techniqueSettings?.Variant_Box_Algebra_1 ?? state.techniqueSettings?.Variant_Box_Algebra) && check_variant_box_algebra_elimination_level1(board, size)],
        // 变型额外区域代数_1
        [() => (state.techniqueSettings?.Variant_Extra_Region_Algebra_1 ?? state.techniqueSettings?.Variant_Extra_Region_Algebra) && check_variant_extra_region_algebra_elimination_level1(board, size)],

        // 变型宫区块_4-size
        ...Array.from({length: size - 3}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Variant_Box_Block_${nat}`] ?? state.techniqueSettings?.Variant_Box_Block) && check_box_block_elimination(board, size, nat, false);
            f.nat = nat;
            f.technique_name = 'Variant_Box_Block';
            return [f];
        }),
        // 变型额外区域区块_4-size
        ...Array.from({length: size - 3}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Variant_Extra_Region_Block_${nat}`] ?? state.techniqueSettings?.Variant_Extra_Region_Block) && check_Extra_Region_Block_Elimination(board, size, nat, false);
            f.nat = nat;
            f.technique_name = 'Variant_Extra_Region_Block';
            return [f];
        }),
        // 特定组合唯余_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_4 && check_special_combination_region_cell_elimination(board, size, 4)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_5 ?? state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_n) && check_special_combination_region_cell_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_6 ?? state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_n) && check_special_combination_region_cell_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_7 ?? state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_n) && check_special_combination_region_cell_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_8 ?? state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_n) && check_special_combination_region_cell_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_9 ?? state.techniqueSettings?.Special_Combination_Region_Cell_Elimination_n) && check_special_combination_region_cell_elimination(board, size, 9)],
        // 特定组合必含_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Contain_4 && check_special_combination_region_must_contain(board, size, 4)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Contain_5 ?? state.techniqueSettings?.Special_Combination_Region_Most_Contain_n) && check_special_combination_region_must_contain(board, size, 5)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Contain_6 ?? state.techniqueSettings?.Special_Combination_Region_Most_Contain_n) && check_special_combination_region_must_contain(board, size, 6)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Contain_7 ?? state.techniqueSettings?.Special_Combination_Region_Most_Contain_n) && check_special_combination_region_must_contain(board, size, 7)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Contain_8 ?? state.techniqueSettings?.Special_Combination_Region_Most_Contain_n) && check_special_combination_region_must_contain(board, size, 8)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Contain_9 ?? state.techniqueSettings?.Special_Combination_Region_Most_Contain_n) && check_special_combination_region_must_contain(board, size, 9)],
        // 特定组合必不含_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_4 && check_special_combination_region_must_not_contain(board, size, 4)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_5 ?? state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_n) && check_special_combination_region_must_not_contain(board, size, 5)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_6 ?? state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_n) && check_special_combination_region_must_not_contain(board, size, 6)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_7 ?? state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_n) && check_special_combination_region_must_not_contain(board, size, 7)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_8 ?? state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_n) && check_special_combination_region_must_not_contain(board, size, 8)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_9 ?? state.techniqueSettings?.Special_Combination_Region_Most_Not_Contain_n) && check_special_combination_region_must_not_contain(board, size, 9)],
        // 特定组合区块_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Block_4 && check_special_combination_region_block_elimination(board, size, 4)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Block_5 ?? state.techniqueSettings?.Special_Combination_Region_Block_n) && check_special_combination_region_block_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Block_6 ?? state.techniqueSettings?.Special_Combination_Region_Block_n) && check_special_combination_region_block_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Block_7 ?? state.techniqueSettings?.Special_Combination_Region_Block_n) && check_special_combination_region_block_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Block_8 ?? state.techniqueSettings?.Special_Combination_Region_Block_n) && check_special_combination_region_block_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Block_9 ?? state.techniqueSettings?.Special_Combination_Region_Block_n) && check_special_combination_region_block_elimination(board, size, 9)],
        // 宫代数_2
        [() => state.techniqueSettings?.Box_Algebra_2 && check_box_algebra_elimination_level2(board, size)],
        // 宫代数_3-size
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Box_Algebra_${depth}`] && check_box_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Box_Algebra_${depth}`;
            return [f];
        }),
        // 额外区域代数_2
        [() => state.techniqueSettings?.Extra_Region_Algebra_2 && check_extra_region_algebra_elimination_level2(board, size)],
        // 额外区域代数_3-size
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Extra_Region_Algebra_${depth}`] && check_extra_region_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Extra_Region_Algebra_${depth}`;
            return [f];
        }),
        // 行列代数_1
        [() => (state.techniqueSettings?.Row_Col_Algebra_1 ?? state.techniqueSettings?.Row_Col_Algebra) && check_row_col_algebra_elimination_level1(board, size)],
        // 行列代数_2
        [() => state.techniqueSettings?.Row_Col_Algebra_2 && check_row_col_algebra_elimination_level2(board, size)],
        // 行列代数_3-size
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Row_Col_Algebra_${depth}`] && check_row_col_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Row_Col_Algebra_${depth}`;
            return [f];
        }),
        // 变型宫代数_2
        [() => state.techniqueSettings?.Variant_Box_Algebra_2 && check_variant_box_algebra_elimination_level2(board, size)],
        // 变型宫代数_3-size
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Variant_Box_Algebra_${depth}`] && check_variant_box_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Variant_Box_Algebra_${depth}`;
            return [f];
        }),
        // 变型额外区域代数_2
        [() => state.techniqueSettings?.Variant_Extra_Region_Algebra_2 && check_variant_extra_region_algebra_elimination_level2(board, size)],
        // 变型额外区域代数_3-size
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Variant_Extra_Region_Algebra_${depth}`] && check_variant_extra_region_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Variant_Extra_Region_Algebra_${depth}`;
            return [f];
        }),
        // 变型行列代数_1（置于变型行列区块_4前）
        [() => (state.techniqueSettings?.Variant_Row_Col_Algebra_1 ?? state.techniqueSettings?.Variant_Row_Col_Algebra) && check_variant_row_col_algebra_elimination_level1(board, size)],
        // 变型行列代数_2（置于变型行列区块_4前）
        [() => state.techniqueSettings?.Variant_Row_Col_Algebra_2 && check_variant_row_col_algebra_elimination_level2(board, size)],
        // 变型行列代数_3-size（置于变型行列区块_4前）
        ...Array.from({length: Math.max(0, size - 2)}, (_, i) => {
            const depth = i + 3;
            const f = () => state.techniqueSettings?.[`Variant_Row_Col_Algebra_${depth}`] && check_variant_row_col_algebra_elimination_by_chain(board, size, depth);
            f.technique_name = `Variant_Row_Col_Algebra_${depth}`;
            return [f];
        }),
        // 变型行列区块_4-size
        ...Array.from({length: size - 3}, (_, i) => {
            const nat = i + 4;
            const f = () => (state.techniqueSettings?.[`Variant_Row_Col_Block_${nat}`] ?? state.techniqueSettings?.Variant_Row_Col_Block) && check_Row_Col_Block_Elimination(board, size, nat, false);
            f.nat = nat;
            f.technique_name = 'Variant_Row_Col_Block';
            return [f];
        }),
        // 特定组合遍历_4-9
        [() => state.techniqueSettings?.Special_Combination_Region_Elimination_4 && check_special_combination_region_elimination(board, size, 4)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Elimination_5 ?? state.techniqueSettings?.Special_Combination_Region_Elimination_n) && check_special_combination_region_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Elimination_6 ?? state.techniqueSettings?.Special_Combination_Region_Elimination_n) && check_special_combination_region_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Elimination_7 ?? state.techniqueSettings?.Special_Combination_Region_Elimination_n) && check_special_combination_region_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Elimination_8 ?? state.techniqueSettings?.Special_Combination_Region_Elimination_n) && check_special_combination_region_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Special_Combination_Region_Elimination_9 ?? state.techniqueSettings?.Special_Combination_Region_Elimination_n) && check_special_combination_region_elimination(board, size, 9)],

        
        // 多特定组合必含_1
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_1 && check_multi_special_combination_region_must_contain(board, size, 1)],
        // 多特定组合必含_2
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_2 && check_multi_special_combination_region_must_contain(board, size, 2)],
        // 多特定组合必不含_1
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_1 && check_multi_special_combination_region_must_not_contain(board, size, 1)],
        // 多特定组合必不含_2
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_2 && check_multi_special_combination_region_must_not_contain(board, size, 2)],
        // 多特定组合唯余_1
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_1 && check_multi_special_combination_region_cell_elimination(board, size, 1)],
        // 多特定组合唯余_2
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_2 && check_multi_special_combination_region_cell_elimination(board, size, 2)],
        // 多特定组合区块_1-2
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_1 && check_multi_special_combination_region_block_elimination(board, size, 1)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_2 && check_multi_special_combination_region_block_elimination(board, size, 2)],
        // 多特定组合遍历_1-2
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_1 && check_multi_special_combination_region_elimination(board, size, 1)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_2 && check_multi_special_combination_region_elimination(board, size, 2)],

        
        // 多特定组合必含_3-4
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_3 && check_multi_special_combination_region_must_contain(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_4 && check_multi_special_combination_region_must_contain(board, size, 4)],
        // 多特定组合必不含_3-4
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_3 && check_multi_special_combination_region_must_not_contain(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_4 && check_multi_special_combination_region_must_not_contain(board, size, 4)],
        // 多特定组合唯余_3-4
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_3 && check_multi_special_combination_region_cell_elimination(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_4 && check_multi_special_combination_region_cell_elimination(board, size, 4)],
        // 多特定组合区块_3-4
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_3 && check_multi_special_combination_region_block_elimination(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Block_4 && check_multi_special_combination_region_block_elimination(board, size, 4)],
        // 多特定组合遍历_3-4
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_3 && check_multi_special_combination_region_elimination(board, size, 3)],
        [() => state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_4 && check_multi_special_combination_region_elimination(board, size, 4)],


        // 多特定组合必含_5-9
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_5 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_n) && check_multi_special_combination_region_must_contain(board, size, 5)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_6 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_n) && check_multi_special_combination_region_must_contain(board, size, 6)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_7 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_n) && check_multi_special_combination_region_must_contain(board, size, 7)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_8 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_n) && check_multi_special_combination_region_must_contain(board, size, 8)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_9 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Contain_n) && check_multi_special_combination_region_must_contain(board, size, 9)],
        // 多特定组合必不含_5-9
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_5 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_n) && check_multi_special_combination_region_must_not_contain(board, size, 5)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_6 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_n) && check_multi_special_combination_region_must_not_contain(board, size, 6)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_7 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_n) && check_multi_special_combination_region_must_not_contain(board, size, 7)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_8 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_n) && check_multi_special_combination_region_must_not_contain(board, size, 8)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_9 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Most_Not_Contain_n) && check_multi_special_combination_region_must_not_contain(board, size, 9)],
        // 多特定组合唯余_5-9
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_5 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_n) && check_multi_special_combination_region_cell_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_6 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_n) && check_multi_special_combination_region_cell_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_7 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_n) && check_multi_special_combination_region_cell_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_8 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_n) && check_multi_special_combination_region_cell_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_9 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Cell_Elimination_n) && check_multi_special_combination_region_cell_elimination(board, size, 9)],
        // 多特定组合区块_5-9
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Block_5 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Block_n) && check_multi_special_combination_region_block_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Block_6 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Block_n) && check_multi_special_combination_region_block_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Block_7 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Block_n) && check_multi_special_combination_region_block_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Block_8 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Block_n) && check_multi_special_combination_region_block_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Block_9 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Block_n) && check_multi_special_combination_region_block_elimination(board, size, 9)],
        // 多特定组合遍历_5-9
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_5 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_n) && check_multi_special_combination_region_elimination(board, size, 5)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_6 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_n) && check_multi_special_combination_region_elimination(board, size, 6)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_7 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_n) && check_multi_special_combination_region_elimination(board, size, 7)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_8 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_n) && check_multi_special_combination_region_elimination(board, size, 8)],
        [() => (state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_9 ?? state.techniqueSettings?.Multi_Special_Combination_Region_Elimination_n) && check_multi_special_combination_region_elimination(board, size, 9)],

        // ==================== 第四优先级组（数对组_3）====================
        // 宫隐性数对组_3
        [() => (state.techniqueSettings?.Box_Hidden_3 ?? state.techniqueSettings?.Box_Hidden_Triple) && check_box_hidden_subset_elimination(board, size, 3)],
        // 额外区域隐性数对组_3
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Hidden_3 ?? state.techniqueSettings?.Extra_Region_Hidden_Triple) && check_extra_region_hidden_subset_elimination(board, size, 3)],
        // 宫显性数对组_2
        [() => (state.techniqueSettings?.Box_Naked_2 ?? state.techniqueSettings?.Box_Naked_Pair) && check_box_naked_subset_elimination(board, size, 2)],
        // 额外区域显性数对组_2
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Naked_2 ?? state.techniqueSettings?.Extra_Region_Naked_Pair) && check_extra_region_naked_subset_elimination(board, size, 2)],
        // 行列显性数对组_2
        [() => (state.techniqueSettings?.Row_Col_Naked_2 ?? state.techniqueSettings?.Row_Col_Naked_Pair) && check_row_col_naked_subset_elimination(board, size, 2)],
        // 行列隐性数对组_2
        [() => (state.techniqueSettings?.Row_Col_Hidden_2 ?? state.techniqueSettings?.Row_Col_Hidden_Pair) && check_row_col_hidden_subset_elimination(board, size, 2)],
        // 行列隐性数对组_3
        [() => (state.techniqueSettings?.Row_Col_Hidden_3 ?? state.techniqueSettings?.Row_Col_Hidden_Triple) && check_row_col_hidden_subset_elimination(board, size, 3)],
        // 宫显性数对组_3
        [() => (state.techniqueSettings?.Box_Naked_3 ?? state.techniqueSettings?.Box_Naked_Triple) && check_box_naked_subset_elimination(board, size, 3)],
        // 额外区域显性数对组_3
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Naked_3 ?? state.techniqueSettings?.Extra_Region_Naked_Triple) && check_extra_region_naked_subset_elimination(board, size, 3)],
        // 行列显性数对组_3
        [() => (state.techniqueSettings?.Row_Col_Naked_3 ?? state.techniqueSettings?.Row_Col_Naked_Triple) && check_row_col_naked_subset_elimination(board, size, 3)],

        // ==================== 第五优先级组（数对组_4）====================
        // 宫隐性数对组_4
        [() => (state.techniqueSettings?.Box_Hidden_4 ?? state.techniqueSettings?.Box_Hidden_Quad) && check_box_hidden_subset_elimination(board, size, 4)],
        // 额外区域隐性数对组_4
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Hidden_4 ?? state.techniqueSettings?.Extra_Region_Hidden_Quad) && check_extra_region_hidden_subset_elimination(board, size, 4)],
        // 行列隐性数对组_4
        [() => (state.techniqueSettings?.Row_Col_Hidden_4 ?? state.techniqueSettings?.Row_Col_Hidden_Quad) && check_row_col_hidden_subset_elimination(board, size, 4)],
        // 宫显性数对组_4
        [() => (state.techniqueSettings?.Box_Naked_4 ?? state.techniqueSettings?.Box_Naked_Quad) && check_box_naked_subset_elimination(board, size, 4)],
        // 额外区域显性数对组_4
        [() => state.current_mode !== 'classic' && (state.techniqueSettings?.Extra_Region_Naked_4 ?? state.techniqueSettings?.Extra_Region_Naked_Quad) && check_extra_region_naked_subset_elimination(board, size, 4)],
        // 行列显性数对组_4
        [() => (state.techniqueSettings?.Row_Col_Naked_4 ?? state.techniqueSettings?.Row_Col_Naked_Quad) && check_row_col_naked_subset_elimination(board, size, 4)],

        // 数对组扩展（_5 到 _9）
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.techniqueSettings?.[`Box_Hidden_${nat}`] && check_box_hidden_subset_elimination(board, size, nat);
            f.technique_name = `Box_Hidden_${nat}`;
            f.nat = nat;
            return [f];
        }),
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.techniqueSettings?.[`Row_Col_Hidden_${nat}`] && check_row_col_hidden_subset_elimination(board, size, nat);
            f.technique_name = `Row_Col_Hidden_${nat}`;
            f.nat = nat;
            return [f];
        }),
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.current_mode !== 'classic' && state.techniqueSettings?.[`Extra_Region_Hidden_${nat}`] && check_extra_region_hidden_subset_elimination(board, size, nat);
            f.technique_name = `Extra_Region_Hidden_${nat}`;
            f.nat = nat;
            return [f];
        }),
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.techniqueSettings?.[`Box_Naked_${nat}`] && check_box_naked_subset_elimination(board, size, nat);
            f.technique_name = `Box_Naked_${nat}`;
            f.nat = nat;
            return [f];
        }),
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.techniqueSettings?.[`Row_Col_Naked_${nat}`] && check_row_col_naked_subset_elimination(board, size, nat);
            f.technique_name = `Row_Col_Naked_${nat}`;
            f.nat = nat;
            return [f];
        }),
        ...Array.from({length: Math.max(0, size - 4)}, (_, i) => {
            const nat = i + 5;
            const f = () => state.current_mode !== 'classic' && state.techniqueSettings?.[`Extra_Region_Naked_${nat}`] && check_extra_region_naked_subset_elimination(board, size, nat);
            f.technique_name = `Extra_Region_Naked_${nat}`;
            f.nat = nat;
            return [f];
        }),

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
                    const techniqueMeta = resolveTechniqueMeta(technique);

                    if (state.implicit_replay_active) {
                        const expectedTrail = Array.isArray(state.implicit_expected_trail) ? state.implicit_expected_trail : [];
                        const replayCursor = Number(state.implicit_replay_cursor) || 0;
                        const expectedEntry = expectedTrail[replayCursor];

                        if (!expectedEntry) {
                            continue;
                        }
                        if (!techniqueMeta.chinese_name || techniqueMeta.chinese_name !== expectedEntry.technique) {
                            continue;
                        }

                        state.implicit_current_replay_target = expectedEntry;
                    } else {
                        state.implicit_current_replay_target = null;
                    }

                    state.implicit_last_application = null;
                    const result = technique();
                    state.implicit_current_replay_target = null;

                    if (result === true) {
                        if (!state.silentMode) log_process("[冲突检测] 发现无解局面");
                        return { changed: false, hasEmptyCandidate: true, technique_counts, technique_scores };
                    }

                    if (!isEqual(board, groupInitialBoard)) {
                        groupChanged = true;
                        const chinese_name = techniqueMeta.chinese_name;
                        const score_key = techniqueMeta.score_key;
                        const nat = techniqueMeta.nat;

                        if (chinese_name) {
                            const implicit_payload = clone_implicit_payload(state.implicit_last_application);
                            state.implicit_last_application = null;
                            const implicit_entry = {
                                technique: chinese_name,
                                score_key: score_key || chinese_name,
                                nat: Number.isFinite(Number(nat)) ? Number(nat) : undefined,
                                payload: implicit_payload
                            };

                            if (state.implicit_replay_active) {
                                const expectedTrail = Array.isArray(state.implicit_expected_trail) ? state.implicit_expected_trail : [];
                                const replayCursor = Number(state.implicit_replay_cursor) || 0;
                                const expectedEntry = expectedTrail[replayCursor];
                                if (!expectedEntry || expectedEntry.technique !== implicit_entry.technique || !is_implicit_payload_match(expectedEntry.payload, implicit_entry.payload)) {
                                    state.implicit_replay_ok = false;
                                    return {
                                        changed: false,
                                        hasEmptyCandidate: false,
                                        technique_counts,
                                        total_score,
                                        technique_scores
                                    };
                                }
                                state.implicit_replay_cursor = replayCursor + 1;
                            }

                            if (state.implicit_collect_enabled) {
                                if (!Array.isArray(state.implicit_trail)) {
                                    state.implicit_trail = [];
                                }
                                state.implicit_trail.push(implicit_entry);
                            }

                            if (technique_counts[chinese_name] === undefined) {
                                technique_counts[chinese_name] = 0;
                            }
                            technique_counts[chinese_name]++;
                            const technique_score = getTechniqueScore(score_key);
                            total_score += technique_score;
                            if (score_key && chinese_name && score_key !== chinese_name) {
                                technique_scores[chinese_name] = technique_score;
                            }

                            const hasNewSolvedCell = hasNewSolvedCellAfterTechnique(groupInitialBoard, board);
                            if (state.check_next && hasNewSolvedCell) {
                                state.check_next = false;
                                return {
                                    changed: true,
                                    hasEmptyCandidate: false,
                                    technique_counts,
                                    total_score,
                                    technique_scores
                                };
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

    // return { changed, hasEmptyCandidate: false, technique_counts, total_score };
    return { changed, hasEmptyCandidate: false, technique_counts, total_score, technique_scores };
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
        // 新增：quadruple模式特殊处理
        if (state.current_mode === 'quadruple' && (region_type === '有重复四格提示' || region_type === '无重复四格提示')) {
            // 获取提示数
            const region = get_all_regions(size, state.current_mode).find(r => r.type === region_type && r.index === region_index);
            if (region && Array.isArray(region.clue_nums)) {
                // num必须在提示数中
                if (!region.clue_nums.includes(num)) continue;
                // 已填入num的数量
                let filledCount = 0;
                for (const [r, c] of region.cells) {
                    if (board[r][c] === num) filledCount++;
                }
                // 提示数中num的数量
                const clueCount = region.clue_nums.filter(n => n === num).length;
                // 填入后不能超过提示数数量
                if (filledCount + 1 > clueCount) continue;
            }
        } else {
            // 跳过已存在的数字
            if (existing_nums.has(num)) continue;
        }
        let positions = [];
        for (const [r, c] of region_cells) {
            if (board[r][c] === -1) continue;
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                positions.push([r, c]);
            }
        }
        if (existing_nums.size >= region_cells.length - nat && positions.length === 1) {
            const [row, col] = positions[0];
            // 新增：填入前先判断是否合法
            if (!isValid(board, size, row, col, num)) {
                has_conflict = true;
                if (!state.silentMode) log_process(`[冲突] ${region_type}${region_index ? region_index : ''}中${getRowLetter(row+1)}${col+1}填${num}不合法，无解`);
                return { changed: false, hasConflict: true };
            }

            let score_sum = 0;
            if (!state.silentMode) {
                // 计算分值：该区域所有未定格子对该数的candidate_elimination_score倒数和
                
                for (const [r, c] of region_cells) {
                    if (Array.isArray(board[r][c])) {
                        const key = `${r},${c},${num}`;
                        const score = state.candidate_elimination_score[key] || 0;
                        if (score > 0) {
                            score_sum += 1 / score;
                        }
                    }
                }
                state.total_score_sum += score_sum;
                score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
            }

            board[row][col] = num;
            // 清空该格子的所有候选数分值
            for (let n = 1; n <= size; n++) {
                state.candidate_elimination_score[`${row},${col},${n}`] = 0;
            }
            if (!state.silentMode) log_process(`[${region_type}排除_${nat}] 第${region_index}${region_type} ${getRowLetter(row+1)}${col+1}=${num}，分值=${score_sum}`);
            eliminate_candidates(board, size, row, col, num);
            return { changed: true, hasConflict: false };
        } else if (positions.length === 0) {
            // has_conflict = true;
            // if (!state.silentMode) log_process(`[冲突] ${region_type}${region_index ? region_index : ''}中数字${num}无可填入位置，无解`);
            // return true;
        }
    }
    return { changed: false, hasConflict: has_conflict };
}

// 统一限制：候选并集大小需与区域格子数一致（与现有额外区域排除逻辑保持一致）。
function can_apply_region_elimination(board, size, region_cells) {
    if (!Array.isArray(region_cells) || region_cells.length === 0) {
        return false;
    }

    const unionSet = new Set();
    for (const [r, c] of region_cells) {
        const cell = board[r][c];
        if (cell === -1 || cell === 0 || cell == null) continue;

        if (typeof cell === 'number') {
            if (cell >= 1 && cell <= size) {
                unionSet.add(cell);
            }
        } else if (Array.isArray(cell)) {
            for (const n of cell) {
                if (n >= 1 && n <= size) {
                    unionSet.add(n);
                }
            }
        }
    }

    const expected_region_size = Math.max(
        0,
        region_cells.length - (state.current_mode === 'missing' ? 1 : 0)
    );

    return unionSet.size === expected_region_size;
}

// 宫排除法
function check_Box_Elimination(board, size, nat = 1) {
    // log_process(`调用一次${nat}`)
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 普通模式下，直接用统一区域生成
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '宫') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            const result = region_elimination(board, size, region.cells, region.type, region.index, nat);
            if (result) {
                if (result.hasConflict) return true;
                if (result.changed) return; // 有变化就退出
            }
            // if (region_elimination(board, size, region.cells, region.type, region.index, nat)) return true;
            // log_process(`调用一次${nat}`)
        }
    }
    return has_conflict;
}

// 行列排除法
function check_row_col_elimination(board, size, nat = 1) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 普通模式下，直接用统一区域生成
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '行' || region.type === '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            const result = region_elimination(board, size, region.cells, region.type, region.index, nat);
            if (result) {
                if (result.hasConflict) return true;
                if (result.changed) return; // 有变化就退出
            }
        }
    }
    return has_conflict;
}


// 额外区域排除法
function check_Extra_Region_Elimination(board, size, nat = 1) {
    let has_conflict = false;
    // 用统一区域生成方式处理对角线
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            const result = region_elimination(board, size, region.cells, region.type, region.index, nat);
            if (result) {
                if (result.hasConflict) return true;
                if (result.changed) return; // 有变化就退出
            }
        }
    }
    return has_conflict;
}

function should_include_algebra_region(region, size, scope = 'box') {
    if (!region || !Array.isArray(region.cells) || region.cells.length !== size) {
        return false;
    }

    if (typeof region.type !== 'string' || region.type.length === 0) {
        return false;
    }

    const is_box_region = region.type === '宫';
    const is_row_col_region = region.type === '行' || region.type === '列';
    const is_extra_region = !is_row_col_region;

    if (scope === 'box') {
        return is_box_region;
    }
    if (scope === 'row_col') {
        return is_box_region || is_row_col_region || is_extra_region;
    }
    if (scope === 'extra') {
        return is_extra_region;
    }
    return false;
}

function find_algebra_conflict_region(board, regions, num) {
    for (const region of regions) {
        let has_fixed_num = false;
        for (const [r, c] of region.cells) {
            if (board[r][c] === num) {
                has_fixed_num = true;
                break;
            }
        }
        if (has_fixed_num) {
            continue;
        }

        let has_candidate = false;
        for (const [r, c] of region.cells) {
            if (Array.isArray(board[r][c]) && board[r][c].includes(num)) {
                has_candidate = true;
                break;
            }
        }

        if (!has_candidate) {
            return region;
        }
    }
    return null;
}

function check_algebra_elimination(board, size, scope, classic, technique_name) {
    return apply_algebra_elimination_with_depth(board, size, scope, classic, technique_name, 1);
}

function normalize_algebra_candidates(cell) {
    if (Array.isArray(cell)) {
        return [...new Set(
            cell
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n))
        )].sort((a, b) => a - b);
    }
    if (typeof cell === 'number' && Number.isFinite(cell) && cell > 0) {
        return [cell];
    }
    return [];
}

function clone_algebra_board(src_board) {
    return src_board.map((row) => row.map((cell) => Array.isArray(cell) ? [...cell] : cell));
}

function apply_algebra_elimination_with_depth(board, size, scope, classic, technique_name, chain_depth = 1) {
    if (state.current_mode === 'missing') {
        return false;
    }
    if (!Number.isInteger(chain_depth) || chain_depth < 1) {
        return false;
    }

    const regions = get_all_regions(size, state.current_mode)
        .filter((region) => should_include_algebra_region(region, size, scope));
    if (regions.length === 0) {
        return false;
    }

    const eliminate_in_chain = (target_board, rr, cc, num) => {
        if (classic) {
            eliminate_candidates_classic(target_board, size, rr, cc, num, false);
        } else {
            eliminate_candidates(target_board, size, rr, cc, num, false);
        }
    };

    const cell_ref = (rr, cc) => `${getRowLetter(rr + 1)}${cc + 1}`;

    const get_trial_numbers_for_anchors = (target_board, anchors) => {
        if (!Array.isArray(anchors) || anchors.length === 0) {
            return [];
        }
        const [sr, sc] = anchors[0];
        const source_candidates = normalize_algebra_candidates(target_board[sr][sc]);
        if (source_candidates.length === 0) {
            return [];
        }

        return source_candidates.filter((num) => {
            for (const [ar, ac] of anchors) {
                const anchor_candidates = normalize_algebra_candidates(target_board[ar][ac]);
                if (!anchor_candidates.includes(num)) {
                    return false;
                }
            }
            return true;
        });
    };

    const simulate_chain_assignment = (base_board, anchors, num) => {
        const board_copy = clone_algebra_board(base_board);

        for (const [ar, ac] of anchors) {
            const cell = board_copy[ar][ac];
            if (typeof cell === 'number') {
                if (cell !== num) {
                    return null;
                }
                continue;
            }
            if (!Array.isArray(cell) || !cell.includes(num)) {
                return null;
            }
            board_copy[ar][ac] = num;
        }

        for (const [ar, ac] of anchors) {
            eliminate_in_chain(board_copy, ar, ac, num);
        }

        return board_copy;
    };

    const get_region_state_after_assignment = (target_board, region, num) => {
        let has_fixed_num = false;
        const candidate_cells = [];

        for (const [rr, cc] of region.cells) {
            const cell = target_board[rr][cc];
            if (cell === num) {
                has_fixed_num = true;
                break;
            }
            if (Array.isArray(cell) && cell.includes(num)) {
                candidate_cells.push([rr, cc]);
            }
        }

        if (has_fixed_num) {
            return { type: 'fixed' };
        }
        if (candidate_cells.length === 0) {
            return { type: 'none' };
        }
        if (candidate_cells.length === 1) {
            return { type: 'unique', cell: candidate_cells[0] };
        }
        return { type: 'multi' };
    };

    // 按“每个区域独立判定”的规则，找出在所有试填数下都落到同一唯一格的区域目标。
    const collect_common_forced_targets_by_region = (base_board, anchors, trial_numbers) => {
        if (!Array.isArray(trial_numbers) || trial_numbers.length === 0) {
            return [];
        }

        const trial_snapshots = [];
        for (const num of trial_numbers) {
            const board_copy = simulate_chain_assignment(base_board, anchors, num);
            if (!board_copy) {
                return [];
            }
            trial_snapshots.push({ num, board: board_copy });
        }

        const forced_targets = [];
        for (const region of regions) {
            let shared_cell_signature = null;
            let shared_cell = null;
            let region_valid = true;

            for (const snapshot of trial_snapshots) {
                const region_state = get_region_state_after_assignment(snapshot.board, region, snapshot.num);
                if (region_state.type !== 'unique') {
                    region_valid = false;
                    break;
                }

                const [ur, uc] = region_state.cell;
                const cell_signature = `${ur},${uc}`;
                if (shared_cell_signature === null) {
                    shared_cell_signature = cell_signature;
                    shared_cell = [ur, uc];
                } else if (shared_cell_signature !== cell_signature) {
                    region_valid = false;
                    break;
                }
            }

            if (region_valid && shared_cell) {
                forced_targets.push({
                    region,
                    cell: shared_cell
                });
            }
        }

        return forced_targets;
    };

    const build_chain_anchor_paths = (target_board, start_cell, depth) => {
        const initial_anchors = [[start_cell[0], start_cell[1]]];
        if (depth <= 1) {
            return [initial_anchors];
        }

        const max_chain_paths = 32;
        const paths = [];

        const dfs = (anchors) => {
            if (paths.length >= max_chain_paths) {
                return;
            }

            if (anchors.length >= depth) {
                paths.push(anchors.map(([ar, ac]) => [ar, ac]));
                return;
            }

            const trial_numbers = get_trial_numbers_for_anchors(target_board, anchors);
            if (trial_numbers.length === 0) {
                return;
            }

            const forced_targets = collect_common_forced_targets_by_region(target_board, anchors, trial_numbers);
            if (forced_targets.length === 0) {
                return;
            }

            for (const forced_target of forced_targets) {
                if (paths.length >= max_chain_paths) {
                    break;
                }
                const [nr, nc] = forced_target.cell;
                if (anchors.some(([ar, ac]) => ar === nr && ac === nc)) {
                    continue;
                }
                dfs([...anchors, [nr, nc]]);
            }
        };

        dfs(initial_anchors);
        return paths;
    };

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!Array.isArray(board[r][c]) || board[r][c].length === 0) {
                continue;
            }

            const anchor_paths = build_chain_anchor_paths(board, [r, c], chain_depth);
            if (!Array.isArray(anchor_paths) || anchor_paths.length === 0) {
                continue;
            }

            for (const anchors of anchor_paths) {
                const next_board = clone_algebra_board(board);
                const changed_cells = new Set();
                const stage1_logs = [];
                const stage1_eval_logs = [];
                const stage2_eval_logs = [];
                const chain_ref = anchors.map(([ar, ac]) => cell_ref(ar, ac)).join('→');

                // Step 1: 链上同数试填导致“某宫无处可填”时，删除链上该数候选。
                const stage1_trial_numbers = get_trial_numbers_for_anchors(next_board, anchors);
                const removable_numbers = [];
                const removable_conflict_regions = new Map();
                for (const num of stage1_trial_numbers) {
                    const sim_board = simulate_chain_assignment(next_board, anchors, num);
                    if (!sim_board) {
                        stage1_eval_logs.push(`试填${num}: 链格并非全部含${num}，跳过`);
                        continue;
                    }
                    const conflict_region = find_algebra_conflict_region(sim_board, regions, num);
                    if (conflict_region) {
                        removable_numbers.push(num);
                        removable_conflict_regions.set(num, conflict_region);
                        stage1_eval_logs.push(`试填${num}: ${format_algebra_region_desc(conflict_region)}${num}无处可填`);
                    } else {
                        stage1_eval_logs.push(`试填${num}: 未出现无处可填`);
                    }
                }

                if (removable_numbers.length > 0) {
                    const removable_set = new Set(removable_numbers);
                    for (const [ar, ac] of anchors) {
                        if (!Array.isArray(next_board[ar][ac])) {
                            continue;
                        }

                        const before = [...next_board[ar][ac]];
                        const after = before.filter((candidate_num) => !removable_set.has(candidate_num));
                        if (after.length < before.length) {
                            next_board[ar][ac] = after;
                            changed_cells.add(`${ar},${ac}`);

                            const deleted_nums = before.filter((candidate_num) => !after.includes(candidate_num));
                            for (const deleted_num of deleted_nums) {
                                const conflict_region = removable_conflict_regions.get(deleted_num);
                                const region_desc = format_algebra_region_desc(conflict_region);
                                stage1_logs.push(`${cell_ref(ar, ac)}删去${deleted_num}(致${region_desc}${deleted_num}无处可填)`);
                            }
                        }
                    }
                }

                // Step 2: 在当前链基础上，逐区域独立判断固定传递格并尝试应用。
                const stage2_trial_numbers = get_trial_numbers_for_anchors(next_board, anchors);
                const should_run_stage2 = stage2_trial_numbers.length >= 2;
                let stage2_log = '';
                let forced_target = null;
                let stage2_forced_candidate_log = '';
                if (should_run_stage2) {
                    const anchor_keys = new Set(anchors.map(([ar, ac]) => `${ar},${ac}`));
                    const forced_targets = collect_common_forced_targets_by_region(next_board, anchors, stage2_trial_numbers);
                    if (forced_targets.length > 0) {
                        stage2_forced_candidate_log = forced_targets
                            .map((forced_entry) => `${format_algebra_region_desc(forced_entry.region)}=>${cell_ref(forced_entry.cell[0], forced_entry.cell[1])}`)
                            .join('；');
                    } else {
                        stage2_forced_candidate_log = '无区域满足共同唯一';
                    }

                    const keep_candidates = new Set();
                    for (const [ar, ac] of anchors) {
                        for (const n of normalize_algebra_candidates(next_board[ar][ac])) {
                            keep_candidates.add(n);
                        }
                    }
                    const kept_nums = [...keep_candidates].sort((a, b) => a - b);

                    for (const forced_entry of forced_targets) {
                        const [tr, tc] = forced_entry.cell;
                        const target_key = `${tr},${tc}`;
                        const region_desc = format_algebra_region_desc(forced_entry.region);
                        if (anchor_keys.has(target_key)) {
                            stage2_eval_logs.push(`${region_desc}锁定${cell_ref(tr, tc)}，但该格在链内，跳过`);
                            continue;
                        }
                        if (!Array.isArray(next_board[tr][tc])) {
                            stage2_eval_logs.push(`${region_desc}锁定${cell_ref(tr, tc)}，但该格已定值，跳过`);
                            continue;
                        }

                        const before = [...next_board[tr][tc]];
                        const after = before.filter((candidate_num) => keep_candidates.has(candidate_num));
                        if (after.length < before.length) {
                            next_board[tr][tc] = after;
                            changed_cells.add(target_key);
                            forced_target = [tr, tc];

                            const deleted_nums = before.filter((candidate_num) => !after.includes(candidate_num));
                            stage2_log = `${region_desc}锁定${cell_ref(tr, tc)}，仅保留链候选并集${kept_nums.join('、')}，删去${deleted_nums.join('、')}`;
                            stage2_eval_logs.push(stage2_log);
                            break;
                        } else {
                            stage2_eval_logs.push(`${region_desc}锁定${cell_ref(tr, tc)}，但保留并集后无删数`);
                        }
                    }
                } else {
                    stage2_forced_candidate_log = '跳过Step2（Step1后共同试填集合少于2个）';
                    stage2_eval_logs.push(`共同试填集合=${stage2_trial_numbers.length}，不进入Step2`);
                }

                if (changed_cells.size === 0) {
                    continue;
                }

                const payload_numbers = [...new Set(
                    [...stage1_trial_numbers, ...stage2_trial_numbers]
                        .map((n) => Number(n))
                        .filter((n) => Number.isFinite(n))
                )].sort((a, b) => a - b);
                const axis_parts = anchors.map(([ar, ac]) => `${ar},${ac}`);
                if (forced_target) {
                    axis_parts.push(`${forced_target[0]},${forced_target[1]}`);
                }
                const algebra_payload = chain_depth <= 1
                    ? {
                        kind: 'algebra',
                        regionType: scope,
                        regionIndex: `${r},${c}`,
                        numbers: payload_numbers,
                        classic,
                        axis: axis_parts.join('>')
                    }
                    : {
                        kind: 'algebra_chain',
                        regionType: scope,
                        regionIndex: `${r},${c}`,
                        numbers: payload_numbers,
                        nat: chain_depth,
                        classic,
                        axis: axis_parts.join('>')
                    };

                if (!is_replay_context_allowed(algebra_payload)) {
                    continue;
                }

                for (let rr = 0; rr < size; rr++) {
                    for (let cc = 0; cc < size; cc++) {
                        board[rr][cc] = Array.isArray(next_board[rr][cc]) ? [...next_board[rr][cc]] : next_board[rr][cc];
                    }
                }

                state.implicit_last_application = clone_implicit_payload(algebra_payload);

                if (!state.silentMode) {
                    const source_ref = cell_ref(r, c);
                    const stage1_msg = stage1_logs.length > 0 ? `，${stage1_logs.join('；')}` : '';
                    const stage2_msg = stage2_log.length > 0 ? `，${stage2_log}` : '';
                    const stage1_trials_msg = stage1_trial_numbers.length > 0 ? stage1_trial_numbers.join('、') : '无';
                    const stage2_trials_msg = stage2_trial_numbers.length > 0 ? stage2_trial_numbers.join('、') : '无';
                    const stage1_eval_msg = stage1_eval_logs.length > 0 ? stage1_eval_logs.join('；') : '无';
                    const stage2_eval_msg = stage2_eval_logs.length > 0 ? stage2_eval_logs.join('；') : '无';
                    const stage2_candidates_msg = stage2_forced_candidate_log || '无';

                    log_process(`[${technique_name}] ${source_ref}链(${chain_ref})`);
                    log_process(`[${technique_name}] Step1试填集合: ${stage1_trials_msg}`);
                    log_process(`[${technique_name}] Step1逐数判定: ${stage1_eval_msg}`);
                    if (stage1_logs.length > 0) {
                        log_process(`[${technique_name}] Step1删数结果: ${stage1_logs.join('；')}`);
                    }
                    if (should_run_stage2) {
                        log_process(`[${technique_name}] Step2试填集合: ${stage2_trials_msg}`);
                        log_process(`[${technique_name}] Step2区域共同唯一候选: ${stage2_candidates_msg}`);
                        log_process(`[${technique_name}] Step2逐区域判定: ${stage2_eval_msg}`);
                        if (stage2_log.length > 0) {
                            log_process(`[${technique_name}] Step2删数结果: ${stage2_log}`);
                        }
                    }
                    if (!stage1_msg && !stage2_msg) {
                        log_process(`[${technique_name}] 本次应用无额外删数详情`);
                    }
                }

                const changed_list = [...changed_cells].map((key) => key.split(',').map(Number));

                for (const [rr, cc] of changed_list) {
                    if (Array.isArray(board[rr][cc]) && board[rr][cc].length === 0) {
                        if (!state.silentMode) {
                            log_process(`[冲突] ${getRowLetter(rr + 1)}${cc + 1}无候选数，无解`);
                        }
                        return true;
                    }
                }

                for (const [rr, cc] of changed_list) {
                    if (Array.isArray(board[rr][cc]) && board[rr][cc].length === 1) {
                        const fixed_num = board[rr][cc][0];
                        board[rr][cc] = fixed_num;
                        if (!state.silentMode) {
                            log_process(`[${technique_name}] ${getRowLetter(rr + 1)}${cc + 1}唯一候选${fixed_num}，直接确定`);
                        }
                        eliminate_candidates(board, size, rr, cc, fixed_num);
                    }
                }

                return;
            }
        }
    }

    return false;
}

function check_algebra_elimination_by_chain(board, size, scope, classic, technique_prefix, chain_depth) {
    if (!Number.isInteger(chain_depth) || chain_depth < 2) {
        return false;
    }
    const technique_name = `${technique_prefix}_${chain_depth}`;
    return apply_algebra_elimination_with_depth(board, size, scope, classic, technique_name, chain_depth);
}

function check_box_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'box', true, '宫代数', chain_depth);
}

function check_row_col_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'row_col', true, '行列代数', chain_depth);
}

function check_extra_region_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'extra', true, '额外区域代数', chain_depth);
}

function check_variant_box_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'box', false, '变型宫代数', chain_depth);
}

function check_variant_row_col_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'row_col', false, '变型行列代数', chain_depth);
}

function check_variant_extra_region_algebra_elimination_by_chain(board, size, chain_depth) {
    return check_algebra_elimination_by_chain(board, size, 'extra', false, '变型额外区域代数', chain_depth);
}

// 宫代数_2：在宫代数_1的单步试填基础上，增加一次“唯一可填位”的连锁试填。
function check_box_algebra_elimination_level2(board, size) {
    return check_box_algebra_elimination_by_chain(board, size, 2);
}

function check_box_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'box', true, '宫代数_1');
}

// 兼容旧调用：未拆分入口时等价于宫代数_1。
function check_box_algebra_elimination(board, size) {
    return check_box_algebra_elimination_level1(board, size);
}

function check_row_col_algebra_elimination_level2(board, size) {
    return check_row_col_algebra_elimination_by_chain(board, size, 2);
}

function check_row_col_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'row_col', true, '行列代数_1');
}

function check_row_col_algebra_elimination(board, size) {
    return check_row_col_algebra_elimination_level1(board, size);
}

function check_extra_region_algebra_elimination_level2(board, size) {
    return check_extra_region_algebra_elimination_by_chain(board, size, 2);
}

function check_extra_region_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'extra', true, '额外区域代数_1');
}

function check_extra_region_algebra_elimination(board, size) {
    return check_extra_region_algebra_elimination_level1(board, size);
}

function check_variant_box_algebra_elimination_level2(board, size) {
    return check_variant_box_algebra_elimination_by_chain(board, size, 2);
}

function check_variant_box_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'box', false, '变型宫代数_1');
}

function check_variant_box_algebra_elimination(board, size) {
    return check_variant_box_algebra_elimination_level1(board, size);
}

function check_variant_row_col_algebra_elimination_level2(board, size) {
    return check_variant_row_col_algebra_elimination_by_chain(board, size, 2);
}

function check_variant_row_col_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'row_col', false, '变型行列代数_1');
}

function check_variant_row_col_algebra_elimination(board, size) {
    return check_variant_row_col_algebra_elimination_level1(board, size);
}

function check_variant_extra_region_algebra_elimination_level2(board, size) {
    return check_variant_extra_region_algebra_elimination_by_chain(board, size, 2);
}

function check_variant_extra_region_algebra_elimination_level1(board, size) {
    return check_algebra_elimination(board, size, 'extra', false, '变型额外区域代数_1');
}

function check_variant_extra_region_algebra_elimination(board, size) {
    return check_variant_extra_region_algebra_elimination_level1(board, size);
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
                        eliminate_candidates(board, size, row, col, num);
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

// 唯余法
function check_cell_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

    // 构建所有区域（宫、行、列）
    // const regions = [];
    const regions = get_all_regions(size, state.current_mode);

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
                    // 新增：填入前先判断是否合法
                    if (!isValid(board, size, row, col, num)) {
                        has_conflict = true;
                        if (!state.silentMode) log_process(`[冲突] ${getRowLetter(row + 1)}${col + 1}填${num}不合法，无解`);
                        return true;
                    }
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
                            let score_sum = 0;
                            if (!state.silentMode) {    
                                // 计算分值：该格子中除num以外的其他候选数的candidate_elimination_score倒数和
                                
                                for (let other = 1; other <= size; other++) {
                                    if (other !== num) {
                                        const key = `${row},${col},${other}`;
                                        const score = state.candidate_elimination_score[key] || 0;
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                        if (score > 0) {
                                            score_sum += 1 / score;
                                            // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${other} -> 分值=${score}`);
                                        }
                                    }
                                }
                                for (let i = 1; i <= nat; i++) {
                                    if (i <= 5) {
                                        score_sum = score_sum * i; // 乘以nat的阶乘
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    } else if (i > 5) {
                                        score_sum = score_sum * (10 - i);
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    } else {
                                        score_sum = score_sum * 1;
                                        // log_process(`候选数分值: [${getRowLetter(row + 1)}${col + 1}] 候选${num} -> 分值=${score_sum}`);
                                    }
                                }
                                score_sum = score_sum / 12; // 4的阶乘
                                state.total_score_sum += score_sum;
                                score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
                            }

                            board[row][col] = num;
                            // 清空该格子的所有候选数分值
                            for (let n = 1; n <= size; n++) {
                                state.candidate_elimination_score[`${row},${col},${n}`] = 0;
                            }
                            let region_name = region.type;
                            let region_index = region.index;
                            if (!state.silentMode) log_process(`[唯余法_${nat}] 第${region_index}${region_name} ${getRowLetter(row + 1)}${col + 1}=${num}，分值=${score_sum}`);
                            eliminate_candidates(board, size, row, col, num);
                            return;
                        }
                    }
                }
            }
        }
    }
    return has_conflict;
}

// 打表法
export function check_lookup_table(board, size) {
    if (state.current_mode === 'skyscraper') {
        apply_skyscraper_marks(board, size);
        // log_process(`[打表法] 已应用摩天大楼提示排除`);
        // function apply_skyscraper_marks(currentBoard, size) {
        //     if (!currentBoard || currentBoard.length !== size + 2) return false;
            
        //     let marked = false;
            
        //     // 从 currentBoard 读取外部提示
        //     const parse_clue = (r, c) => {
        //         const val = state.clues_board[r][c];
        //         // log_process(`解析提示位置 (${r+1},${c+1})，值为 ${val}`);
        //         if (typeof val === 'number' && val > 0) return val;
        //         return 0;
        //     };
            
        //     // 辅助函数：从候选数中删除特定数字
        //     const remove_candidate = (candidates, num) => {
        //         if (Array.isArray(candidates) && candidates.includes(num)) {
        //             const index = candidates.indexOf(num);
        //             if (index !== -1) {
        //                 candidates.splice(index, 1);
        //                 return true;
        //             }
        //         }
        //         return false;
        //     };
            
        //     // 处理行提示（左侧和右侧）
        //     for (let row = 0; row < size; row++) {
        //         const left_clue = parse_clue(row + 1, 0);
        //         const right_clue = parse_clue(row + 1, size + 1);
                
        //         // 处理左侧提示
        //         if (left_clue > 0) {
        //             if (left_clue === 1) {
        //                 // 左侧提示为1：第一格只能填最大值size
        //                 const candidates = currentBoard[row + 1][1];
        //                 if (Array.isArray(candidates)) {
        //                     for (let num = 1; num < size; num++) {
        //                         if (remove_candidate(candidates, num)) marked = true;
        //                     }
        //                 }
        //             } else if (left_clue === size) {
        //                 // 左侧提示为size：第k格只能填k
        //                 for (let k = 0; k < size; k++) {
        //                     const candidates = currentBoard[row + 1][k + 1];
        //                     // log_process(`处理左侧提示为 size，行 ${row+1}，位置 (${row+1},${k+1}) 的候选数：${Array.isArray(candidates) ? candidates.join(',') : candidates}`);
        //                     if (Array.isArray(candidates)) {
        //                         for (let num = 1; num <= size; num++) {
        //                             if (num !== k + 1 && remove_candidate(candidates, num)) {
        //                                 marked = true;
        //                                 // log_process(`从位置 (${row+1},${k+1}) 的候选数中删除 ${num}`);
        //                             }
        //                         }
        //                     }
        //                 }
        //             } else {
        //                 // 左侧提示为n：前n-1格删掉size的候选，前n-2格删掉size-1的候选...
        //                 for (let i = 0; i < left_clue - 1; i++) {
        //                     const num_to_remove = size - i;
        //                     for (let j = 0; j <= left_clue - 2 - i; j++) {
        //                         const candidates = currentBoard[row + 1][j + 1];
        //                         if (Array.isArray(candidates)) {
        //                             if (remove_candidate(candidates, num_to_remove)) marked = true;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
                
        //         // 处理右侧提示
        //         if (right_clue > 0) {
        //             if (right_clue === 1) {
        //                 // 右侧提示为1：最后一格只能填最大值size
        //                 const candidates = currentBoard[row + 1][size];
        //                 if (Array.isArray(candidates)) {
        //                     for (let num = 1; num < size; num++) {
        //                         if (remove_candidate(candidates, num)) marked = true;
        //                     }
        //                 }
        //             } else if (right_clue === size) {
        //                 // 右侧提示为size：从右侧数第k格只能填k
        //                 for (let k = 0; k < size; k++) {
        //                     const candidates = currentBoard[row + 1][size - k];
        //                     if (Array.isArray(candidates)) {
        //                         for (let num = 1; num <= size; num++) {
        //                             if (num !== k + 1 && remove_candidate(candidates, num)) {
        //                                 marked = true;
        //                             }
        //                         }
        //                     }
        //                 }
        //             } else {
        //                 // 右侧提示为n：从右侧数前n-1格删掉size的候选...
        //                 for (let i = 0; i < right_clue - 1; i++) {
        //                     const num_to_remove = size - i;
        //                     for (let j = 0; j <= right_clue - 2 - i; j++) {
        //                         const candidates = currentBoard[row + 1][size - j];
        //                         if (Array.isArray(candidates)) {
        //                             if (remove_candidate(candidates, num_to_remove)) marked = true;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
            
        //     // 处理列提示（上方和下方）
        //     for (let col = 0; col < size; col++) {
        //         const top_clue = parse_clue(0, col + 1);
        //         const bottom_clue = parse_clue(size + 1, col + 1);
                
        //         // 处理上方提示
        //         if (top_clue > 0) {
        //             if (top_clue === 1) {
        //                 // 上方提示为1：第一格只能填最大值size
        //                 const candidates = currentBoard[1][col + 1];
        //                 if (Array.isArray(candidates)) {
        //                     for (let num = 1; num < size; num++) {
        //                         if (remove_candidate(candidates, num)) marked = true;
        //                     }
        //                 }
        //             } else if (top_clue === size) {
        //                 // 上方提示为size：第k格只能填k
        //                 for (let k = 0; k < size; k++) {
        //                     const candidates = currentBoard[k + 1][col + 1];
        //                     if (Array.isArray(candidates)) {
        //                         for (let num = 1; num <= size; num++) {
        //                             if (num !== k + 1 && remove_candidate(candidates, num)) {
        //                                 marked = true;
        //                             }
        //                         }
        //                     }
        //                 }
        //             } else {
        //                 // 上方提示为n：前n-1格删掉size的候选...
        //                 for (let i = 0; i < top_clue - 1; i++) {
        //                     const num_to_remove = size - i;
        //                     for (let j = 0; j <= top_clue - 2 - i; j++) {
        //                         const candidates = currentBoard[j + 1][col + 1];
        //                         if (Array.isArray(candidates)) {
        //                             if (remove_candidate(candidates, num_to_remove)) marked = true;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
                
        //         // 处理下方提示
        //         if (bottom_clue > 0) {
        //             if (bottom_clue === 1) {
        //                 // 下方提示为1：最后一格只能填最大值size
        //                 const candidates = currentBoard[size][col + 1];
        //                 if (Array.isArray(candidates)) {
        //                     for (let num = 1; num < size; num++) {
        //                         if (remove_candidate(candidates, num)) marked = true;
        //                     }
        //                 }
        //             } else if (bottom_clue === size) {
        //                 // 下方提示为size：从下方数第k格只能填k
        //                 for (let k = 0; k < size; k++) {
        //                     const candidates = currentBoard[size - k][col + 1];
        //                     if (Array.isArray(candidates)) {
        //                         for (let num = 1; num <= size; num++) {
        //                             if (num !== k + 1 && remove_candidate(candidates, num)) {
        //                                 marked = true;
        //                             }
        //                         }
        //                     }
        //                 }
        //             } else {
        //                 // 下方提示为n：从下方数前n-1格删掉size的候选...
        //                 for (let i = 0; i < bottom_clue - 1; i++) {
        //                     const num_to_remove = size - i;
        //                     for (let j = 0; j <= bottom_clue - 2 - i; j++) {
        //                         const candidates = currentBoard[size - j][col + 1];
        //                         if (Array.isArray(candidates)) {
        //                             if (remove_candidate(candidates, num_to_remove)) marked = true;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
            
        //     return marked;
        // }
    } else if (state.current_mode === 'X_sums') {
        apply_X_sums_marks(board, size);
        // log_process(`[打表法] 已应用温度计提示排除`);
    } else if (state.current_mode === 'quadruple') {
        apply_quadruple_marks(board, size);
    } else if (state.current_mode === 'odd') {
        apply_odd_marks(board, size);
    } else if (state.current_mode === 'odd_even') {
        apply_odd_even_marks(board, size);
    } else if (state.current_mode === 'full') {
        apply_full_marks(board, size);
    } else if (state.current_mode === 'exclusion') {
        apply_exclusion_marks(board, size);
    } else if (state.current_mode === 'inequality') {
        apply_inequality_marks(board, size);
    } else if (state.current_mode === 'thermo') {
        apply_thermo_marks(board, size);
    } else if (state.current_mode === 'fortress') {
        apply_fortress_marks(board, size);
    } else if (state.current_mode === 'five_six') {
        apply_five_six_marks(board, size);
    }
}
function is_special_combination_region_type(region_type) {
    return region_type === '特定组合' || region_type === '合并特定组合';
}

function is_block_special_combination_region_type(region_type) {
    return is_special_combination_region_type(region_type) || region_type === '单格特定组合';
}

function passes_special_combination_post_simulation_checks(board, size, region_cells, unknown_indices, path) {
    if (!Array.isArray(unknown_indices) || unknown_indices.length === 0) {
        return true;
    }

    const simulated_board = board.map(row_cells =>
        row_cells.map(cell => Array.isArray(cell) ? [...cell] : cell)
    );

    const filled_entries = [];
    for (let i = 0; i < unknown_indices.length; i++) {
        const idx = unknown_indices[i];
        const [r, c] = region_cells[idx];
        const num = path[i];
        if (!Number.isInteger(num)) {
            return false;
        }
        simulated_board[r][c] = num;
        filled_entries.push({ r, c, num });
    }

    for (const { r, c, num } of filled_entries) {
        eliminate_candidates(simulated_board, size, r, c, num, false);
    }

    const anchor = filled_entries[0];
    const regions = get_all_regions(size, state.current_mode);

    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            continue;
        }
        if (!region.cells.some(([r, c]) => r === anchor.r && c === anchor.c)) {
            continue;
        }

        for (const [r, c] of region.cells) {
            const cell = simulated_board[r][c];
            if (Array.isArray(cell) && cell.length === 0) {
                return false;
            }
        }

        for (let num = 1; num <= size; num++) {
            let has_available_cell = false;

            for (const [r, c] of region.cells) {
                const cell = simulated_board[r][c];
                if (cell === num || (Array.isArray(cell) && cell.includes(num))) {
                    has_available_cell = true;
                    break;
                }
            }

            if (!has_available_cell) {
                return false;
            }
        }
    }

    return true;
}

// 特定组合必含核心函数
function special_combination_region_must_contain(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;
    if (region_type === '特定组合') {
        region_type = '特定组合必含'
    } else if (region_type === '合并特定组合') {
        region_type = '合并特定组合必含'
    }
    const fixed_counts = new Array(size + 1).fill(0);
    const unknown_indices = [];

    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        const cell = board[r][c];
        if (Array.isArray(cell)) {
            unknown_indices.push(i);
        } else if (typeof cell === 'number') {
            fixed_counts[cell] += 1;
        }
    }

    if (unknown_indices.length === 0) {
        return changed;
    }

    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
    const path = new Array(unknown_indices.length);
    const all_solutions = [];

    function find_all_solutions(depth) {
        if (depth === unknown_indices.length) {
            // 暂时关闭：模拟填入后的冲突检测（某宫/行/列某数字无处可填、某格无候选）。
            // if (!passes_special_combination_post_simulation_checks(board_clone, size, region_cells, unknown_indices, path)) {
            //     return;
            // }
            all_solutions.push([...path]);
            return;
        }

        const idx = unknown_indices[depth];
        const [r, c] = region_cells[idx];
        const candidates = board[r][c];

        for (const num of candidates) {
            const prev = board_clone[r][c];
            board_clone[r][c] = num;

            if (isValid(board_clone, size, r, c, num)) {
                path[depth] = num;
                find_all_solutions(depth + 1);
            }

            board_clone[r][c] = prev;
        }
    }

    find_all_solutions(0);

    if (all_solutions.length === 0) {
        const implicit_payload = {
            kind: 'special_combination_must_contain',
            regionType: region_type,
            regionIndex: region_index,
            numbers: [],
            nat
        };
        if (!is_replay_context_allowed(implicit_payload)) {
            return false;
        }

        for (const idx of unknown_indices) {
            const [r, c] = region_cells[idx];
            if (Array.isArray(board[r][c]) && board[r][c].length > 0) {
                board[r][c] = [];
                changed = true;
            }
        }
        if (changed) {
            state.implicit_last_application = clone_implicit_payload(implicit_payload);
        }
        return changed;
    }

    const min_occurrences = new Array(size + 1).fill(null);
    for (const solution of all_solutions) {
        const freq = fixed_counts.slice();
        for (const num of solution) {
            freq[num] += 1;
        }
        for (let num = 1; num <= size; num++) {
            if (min_occurrences[num] === null) {
                min_occurrences[num] = freq[num];
            } else {
                min_occurrences[num] = Math.min(min_occurrences[num], freq[num]);
            }
        }
    }

    for (let num = 1; num <= size; num++) {
        if (min_occurrences[num] === null) {
            min_occurrences[num] = fixed_counts[num];
        }
    }

    const forced_actions = [];
    for (let num = 1; num <= size; num++) {
        const min_occ = min_occurrences[num];
        if (!min_occ || min_occ < 0) continue;

        const possibleCells = [];
        for (const [r, c] of region_cells) {
            const cell = board[r][c];
            if (Array.isArray(cell)) {
                if (cell.includes(num)) {
                    possibleCells.push({ r, c, fixed: false });
                }
            } else if (typeof cell === 'number' && cell === num) {
                possibleCells.push({ r, c, fixed: true });
            }
        }

        if (possibleCells.length === min_occ) {
            forced_actions.push({ num, min_occ, cells: possibleCells });
        }
    }

    const forced_numbers = [...new Set(
        forced_actions
            .map(({ num }) => Number(num))
            .filter((num) => Number.isFinite(num))
    )].sort((a, b) => a - b);
    const forced_payload = {
        kind: 'special_combination_must_contain',
        regionType: region_type,
        regionIndex: region_index,
        numbers: forced_numbers,
        nat
    };
    const can_apply_forced = forced_actions.length > 0 && is_replay_context_allowed(forced_payload);

    const forcedLog = new Map();
    const processed = new Set();

    if (can_apply_forced) {
        for (const { num, min_occ, cells } of forced_actions) {
            for (const { r, c, fixed } of cells) {
                const key = `${r},${c}`;
                if (fixed || processed.has(key)) continue;

                const cell = board[r][c];
                if (!Array.isArray(cell)) continue;

                const backup = [...cell];
                board[r][c] = num;

                if (!isValid(board, size, r, c, num)) {
                    board[r][c] = backup;
                    continue;
                }

                for (let candidate = 1; candidate <= size; candidate++) {
                    state.candidate_elimination_score[`${r},${c},${candidate}`] = 0;
                }

                eliminate_candidates(board, size, r, c, num);
                processed.add(key);
                changed = true;

                if (!forcedLog.has(num)) {
                    forcedLog.set(num, { positions: [], min_occ });
                }
                forcedLog.get(num).positions.push(`${getRowLetter(r + 1)}${c + 1}`);
            }
        }
    }

    if (!state.silentMode && forcedLog.size > 0) {
        const details = [];
        for (const [num, info] of forcedLog) {
            const suffix = info.min_occ ? ` (最少出现${info.min_occ}次)` : '';
            details.push(`${info.positions.join('、')}=${num}${suffix}`);
        }
        log_process(`[${region_type}排除_${nat}] ${region_index}${region_type} ${details.join('；')}`);
    }

    if (changed) {
        state.implicit_last_application = clone_implicit_payload(forced_payload);
    }

    if (!changed) {
        // 若某个数字“必含但位置不唯一确定”，则尝试区块排除
        for (let num = 1; num <= size; num++) {
            const min_occ = min_occurrences[num];
            if (!min_occ || min_occ < 0) continue;

            const fixed_occ = fixed_counts[num] || 0;
            // 必含次数已被固定数满足，不需要再处理
            if (min_occ <= fixed_occ) continue;

            // 当前区域内该数字的候选位置（只统计未定格）
            const candidate_positions = [];
            for (const [r, c] of region_cells) {
                const cell = board[r][c];
                if (Array.isArray(cell) && cell.includes(num)) {
                    candidate_positions.push([r, c]);
                }
            }

            const possible_count = fixed_occ + candidate_positions.length;

            // possible_count === min_occ 时，属于“位置已确定”(上面 forced_actions 已处理)
            // 这里只处理 possible_count > min_occ：必含但不确定落在哪些格
            if (possible_count <= min_occ) continue;
            if (candidate_positions.length < 2) continue;

            // 特定组合属于变型约束：classic=false
            if (region_block_elimination(
                board,
                size,
                region_cells,
                region_type,
                region_index,
                true,
                candidate_positions.length,
                num
            )) {
                return true;
            }
        }
    }
    return changed;
}

// 特定组合必含排除
function check_special_combination_region_must_contain(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(board, size, state.current_mode);

    for (const region of regions) {
        if (is_special_combination_region_type(region.type)) {
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            if (uncertain_cells.length !== nat) continue;

            if (special_combination_region_must_contain(board, size, region.cells, region.type, region.index, nat)) return;
        }
    }
    return has_conflict;
}

// 多特定组合必含排除
function check_multi_special_combination_region_must_contain(board, size, nat = 1) {
    const regions = get_special_combination_regions(board, size, state.current_mode)
        .filter(region => region.type !== '单格特定组合');
    if (regions.length < 2) return false;

    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));

            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;

            if (intersection.length > 0) {
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];

                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue;

                const changed = special_combination_region_must_contain(
                    board,
                    size,
                    merged_cells,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return;
            }
        }
    }
    return false;
}

// 特定组合必不含
function special_combination_region_must_not_contain(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;
    
    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    // 2. 提取所有合法方案
    const all_solutions = [];
    let foundCombo = false;

    if (unknown_indices.length > 0) {
        // 创建副本用于回溯
        const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
        const path = new Array(unknown_indices.length);
        
        function find_all_solutions(depth) {
            if (depth === unknown_indices.length) {
                // 暂时关闭：模拟填入后的冲突检测（某宫/行/列某数字无处可填、某格无候选）。
                // if (!passes_special_combination_post_simulation_checks(board_clone, size, region_cells, unknown_indices, path)) {
                //     return;
                // }
                foundCombo = true;
                // 保存完整方案副本
                all_solutions.push([...path]);
                return;
            }

            const idx = unknown_indices[depth];
            const [r, c] = region_cells[idx];
            const candidates = board[r][c];

            for (const num of candidates) {
                const prev = board_clone[r][c];
                board_clone[r][c] = num;

                if (isValid(board_clone, size, r, c, num)) {
                    path[depth] = num;
                    find_all_solutions(depth + 1);
                }

                board_clone[r][c] = prev;
            }
        }
        
        find_all_solutions(0);

        if (!foundCombo) {
             const implicit_payload = {
                kind: 'special_combination_must_not_contain',
                regionType: region_type,
                regionIndex: region_index,
                numbers: [],
                nat
            };
            if (!is_replay_context_allowed(implicit_payload)) {
                return false;
            }

             // 无解，清空所有候选数
             for (const idx of unknown_indices) {
                const [r, c] = region_cells[idx];
                if (board[r][c].length > 0) {
                    board[r][c] = [];
                    changed = true;
                }
            }
            if (changed) {
                state.implicit_last_application = clone_implicit_payload(implicit_payload);
            }
            return changed;
        }
    }

    // 3. 提取所有方案中出现过的数字并集
    const union_of_nums = new Set();
    for (const solution of all_solutions) {
        for (const num of solution) {
            union_of_nums.add(num);
        }
    }

    // 4. 找出1-size中不在并集内的数字
    const nums_to_delete = [];
    for (let i = 1; i <= size; i++) {
        if (!union_of_nums.has(i)) {
            nums_to_delete.push(i);
        }
    }

    if (nums_to_delete.length === 0) {
        return false;
    }

    const implicit_payload = {
        kind: 'special_combination_must_not_contain',
        regionType: region_type,
        regionIndex: region_index,
        numbers: nums_to_delete,
        nat
    };
    if (!is_replay_context_allowed(implicit_payload)) {
        return false;
    }

    // // 5. 对所有格子删除不在并集内的数字
    // for (let idx of unknown_indices) {
    //     const [r, c] = region_cells[idx];
    //     const before_len = board[r][c].length;
        
    //     const new_candidates = board[r][c].filter(n => !nums_to_delete.includes(n));
        
    //     if (new_candidates.length < before_len) {
    //         const deleted = board[r][c].filter(n => nums_to_delete.includes(n));
    //         board[r][c] = new_candidates;
    //         changed = true;
    //         if (!state.silentMode) {
    //             log_process(`[${region_type}必不含_${nat}] ${region_index}${region_type}的${getRowLetter(r+1)}${c+1}删去${deleted.join('、')}`);
    //         }
    //     }
    // }
    // 5. 对所有格子删除不在并集内的数字
    const deletion_records = []; // 记录所有删除操作
    
    for (let idx of unknown_indices) {
        const [r, c] = region_cells[idx];
        const before_len = board[r][c].length;
        
        const new_candidates = board[r][c].filter(n => !nums_to_delete.includes(n));
        
        if (new_candidates.length < before_len) {
            const deleted = board[r][c].filter(n => nums_to_delete.includes(n));
            board[r][c] = new_candidates;
            changed = true;
            deletion_records.push({
                pos: `${getRowLetter(r+1)}${c+1}`,
                deleted: deleted
            });
        }
    }
    
    // 统一输出所有删除记录，按删除的数字分组
    if (!state.silentMode && deletion_records.length > 0) {
        // 建立 删除数字 -> 格子列表 的映射
        const deletion_map = {};
        for (const record of deletion_records) {
            for (const num of record.deleted) {
                if (!deletion_map[num]) {
                    deletion_map[num] = [];
                }
                deletion_map[num].push(record.pos);
            }
        }
        
        // 生成输出字符串
        const deletion_details = Object.keys(deletion_map)
            .map(num => `${deletion_map[num].join('、')}删去${num}`)
            .join('；');
        log_process(`[${region_type}必不含_${nat}] ${region_index}${region_type}的${deletion_details}`);
    }
    if (changed) {
        state.implicit_last_application = clone_implicit_payload(implicit_payload);
    }
    return changed;
}

// 对应的检查函数1：单个特定组合检查
function check_special_combination_region_must_not_contain(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(board, size, state.current_mode);

    for (const region of regions) {
        if (is_special_combination_region_type(region.type)) {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            // log_process(`[特定组合必不含] 检查第${region.index}特定组合，数字${region.clue_nums.join('、')}，未定格子数=${uncertain_cells.length}`);
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // 调用特定组合必不含函数
            if (special_combination_region_must_not_contain(board, size, region.cells, region.type, region.index, nat)) return; // 如果有变化，直接返回
        }
    }
    return has_conflict;
}

// 对应的检查函数2：多特定组合联合检查
function check_multi_special_combination_region_must_not_contain(board, size, nat = 1) {
    // 1. 获取所有可参与合并的特定组合
    const regions = get_special_combination_regions(board, size, state.current_mode)
        .filter(region => region.type !== '单格特定组合');
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;

            if (intersection.length > 0) {
                // 5. 合并格子和数字，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用必不含函数
                const changed = special_combination_region_must_not_contain(
                    board,
                    size,
                    merged_cells,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return; // 只要有变化就返回
            }
        }
    }
    return false;
}

// 特定组合唯余核心函数
function special_combination_region_cell_elimination(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;
    
    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    // 2. 记录各格子在合法分配下可以出现的数字
    const valid_nums_for_cell = region_cells.map(() => new Set());
    let foundCombo = false;

    if (unknown_indices.length > 0) {
        // 创建副本用于回溯
        const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
        const path = new Array(unknown_indices.length);
        
        function find_all_solutions(depth) {
            if (depth === unknown_indices.length) {
                // 暂时关闭：模拟填入后的冲突检测（某宫/行/列某数字无处可填、某格无候选）。
                // if (!passes_special_combination_post_simulation_checks(board_clone, size, region_cells, unknown_indices, path)) {
                //     return;
                // }
                foundCombo = true;
                for (let i = 0; i < unknown_indices.length; i++) {
                    valid_nums_for_cell[unknown_indices[i]].add(path[i]);
                }
                return;
            }

            const idx = unknown_indices[depth];
            const [r, c] = region_cells[idx];
            const candidates = board[r][c];

            for (const num of candidates) {
                const prev = board_clone[r][c];
                board_clone[r][c] = num;

                if (isValid(board_clone, size, r, c, num)) {
                    path[depth] = num;
                    find_all_solutions(depth + 1);
                }

                board_clone[r][c] = prev;
            }
        }
        
        find_all_solutions(0);

        if (!foundCombo) {
             const implicit_payload = {
                kind: 'special_combination_cell_elimination',
                regionType: region_type,
                regionIndex: region_index,
                numbers: [],
                nat
            };
            if (!is_replay_context_allowed(implicit_payload)) {
                return false;
            }

             // 无解，清空所有候选数
             for (const idx of unknown_indices) {
                const [r, c] = region_cells[idx];
                if (board[r][c].length > 0) {
                    board[r][c] = [];
                    changed = true;
                }
            }
            if (changed) {
                state.implicit_last_application = clone_implicit_payload(implicit_payload);
            }
            return changed;
        }
    }

    // 3. 过滤候选数 - 仅在能直接出数时才进行排除
    const pending_fills = [];
    for (let idx of unknown_indices) {
        const [r, c] = region_cells[idx];
        const valid_nums = valid_nums_for_cell[idx];
        const new_candidates = board[r][c].filter(n => valid_nums.has(n));
        if (new_candidates.length === 1) {
            pending_fills.push({ idx, r, c, num: new_candidates[0] });
        }
    }

    if (pending_fills.length === 0) {
        return false;
    }

    const implicit_payload = {
        kind: 'special_combination_cell_elimination',
        regionType: region_type,
        regionIndex: region_index,
        numbers: [...new Set(
            pending_fills
                .map((item) => Number(item.num))
                .filter((num) => Number.isFinite(num))
        )].sort((a, b) => a - b),
        nat
    };
    if (!is_replay_context_allowed(implicit_payload)) {
        return false;
    }

    const fill_records = []; // 记录所有填入操作
    for (const item of pending_fills) {
        const { r, c, num } = item;
        if (!Array.isArray(board[r][c]) || !board[r][c].includes(num)) {
            continue;
        }
        board[r][c] = num;
        eliminate_candidates(board, size, r, c, num);
        changed = true;
        fill_records.push({
            pos: `${getRowLetter(r+1)}${c+1}`,
            num: num
        });
    }
    // 统一输出所有填入记录
    if (!state.silentMode && fill_records.length > 0) {
        // 建立 数字 -> 格子列表 的映射
        const fill_map = {};
        for (const record of fill_records) {
            if (!fill_map[record.num]) {
                fill_map[record.num] = [];
            }
            fill_map[record.num].push(record.pos);
        }
        
        // 生成输出字符串
        const fill_details = Object.keys(fill_map)
            .map(num => `${fill_map[num].join('、')}=${num}`)
            .join('，');
        log_process(`[${region_type}唯余_${nat}] ${region_index}${region_type} ${fill_details}`);
    }
    if (changed) {
        state.implicit_last_application = clone_implicit_payload(implicit_payload);
    }
    return changed;
}

// 特定组合唯余
function check_special_combination_region_cell_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(board, size, state.current_mode);

    for (const region of regions) {
        if (is_special_combination_region_type(region.type)) {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // 调用特定组合格子排除函数
            if (special_combination_region_cell_elimination(board, size, region.cells, region.type, region.index, nat)) return; // 如果有变化，直接返回
        }
    }
    return has_conflict;
}

// 多特定组合唯余
function check_multi_special_combination_region_cell_elimination(board, size, nat = 1) {
    // 1. 获取所有可参与合并的特定组合
    const regions = get_special_combination_regions(board, size, state.current_mode)
        .filter(region => region.type !== '单格特定组合');
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;

            if (intersection.length > 0) {
                // 5. 合并格子，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用已有的排除函数
                const changed = special_combination_region_cell_elimination(
                    board,
                    size,
                    merged_cells,
                    '合并特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return;
            }
        }
    }
    return false;
}

/**
 * 特定组合候选数排除（只删候选，不模拟填入和全局冲突）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域四个格子的坐标
 * @param {Array<number>} clue_nums - 区域的四个数字
 * @param {string} region_type - 区域类型（如 '特定组合'）
 * @param {number} region_index - 区域编号
 * @returns {boolean} 是否有变化
 */
// 变型特定组合遍历
function special_combination_region_elimination(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;
    
    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    // 2. 记录各格子在合法分配下可以出现的数字
    const valid_nums_for_cell = region_cells.map(() => new Set());
    let foundCombo = false;

    if (unknown_indices.length > 0) {
        // 创建副本用于回溯
        const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
        const path = new Array(unknown_indices.length);
        
        function find_all_solutions(depth) {
            if (depth === unknown_indices.length) {
                // 暂时关闭：模拟填入后的冲突检测（某宫/行/列某数字无处可填、某格无候选）。
                // if (!passes_special_combination_post_simulation_checks(board_clone, size, region_cells, unknown_indices, path)) {
                //     return;
                // }
                foundCombo = true;
                for (let i = 0; i < unknown_indices.length; i++) {
                    valid_nums_for_cell[unknown_indices[i]].add(path[i]);
                }
                return;
            }

            const idx = unknown_indices[depth];
            const [r, c] = region_cells[idx];
            const candidates = board[r][c];

            for (const num of candidates) {
                const prev = board_clone[r][c];
                board_clone[r][c] = num;

                if (isValid(board_clone, size, r, c, num)) {
                    path[depth] = num;
                    find_all_solutions(depth + 1);
                }

                board_clone[r][c] = prev;
            }
        }
        
        find_all_solutions(0);

        if (!foundCombo) {
             const implicit_payload = {
                kind: 'special_combination_elimination',
                regionType: region_type,
                regionIndex: region_index,
                numbers: [],
                nat
            };
            if (!is_replay_context_allowed(implicit_payload)) {
                return false;
            }

             // 无解，清空所有候选数
             for (const idx of unknown_indices) {
                const [r, c] = region_cells[idx];
                if (board[r][c].length > 0) {
                    board[r][c] = [];
                    changed = true;
                }
            }
            if (changed) {
                state.implicit_last_application = clone_implicit_payload(implicit_payload);
            }
            return changed;
        }
    }

    const implicit_payload = {
        kind: 'special_combination_elimination',
        regionType: region_type,
        regionIndex: region_index,
        numbers: [...new Set(
            unknown_indices.flatMap((idx) => Array.from(valid_nums_for_cell[idx] || []))
        )].sort((a, b) => a - b),
        nat
    };
    if (!is_replay_context_allowed(implicit_payload)) {
        return false;
    }

    // 3. 过滤候选数
    for (let idx of unknown_indices) {
        const [r, c] = region_cells[idx];
        const valid_nums = valid_nums_for_cell[idx];
        const before_len = board[r][c].length;
        
        const new_candidates = board[r][c].filter(n => valid_nums.has(n));
        
        if (new_candidates.length < before_len) {
            const deleted = board[r][c].filter(n => !valid_nums.has(n));
            board[r][c] = new_candidates;
            changed = true;
            if (!state.silentMode) {
                log_process(`[${region_type}遍历_${nat}] ${region_index}${region_type}的${getRowLetter(r+1)}${c+1}删去${deleted.join('、')}`);
            }
        }
        
        // 修复：填数逻辑移出到这里。只要剩下一个候选数，就将其转为确定数字
        if (Array.isArray(board[r][c]) && board[r][c].length === 1) {
            const num = board[r][c][0];
            board[r][c] = num;
            eliminate_candidates(board, size, r, c, num);
            changed = true;
            if (!state.silentMode) {
                log_process(`[${region_type}遍历_${nat}] ${region_index}${region_type}的${getRowLetter(r+1)}${c+1}唯一可填${num}，直接确定`);
            }
        }
    }
    if (changed) {
        state.implicit_last_application = clone_implicit_payload(implicit_payload);
    }
    return changed;
}

function check_special_combination_region_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(board, size, state.current_mode);

    for (const region of regions) {
        if (is_special_combination_region_type(region.type)) {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            // log_process(`[特定组合遍历] 检查第${region.index}特定组合，数字${region.clue_nums.join('、')}，未定格子数=${uncertain_cells.length}`);
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // 调用特定组合遍历函数
            if (special_combination_region_elimination(board, size, region.cells, region.type, region.index, nat)) return; // 如果有变化，直接返回
        }
    }
    return has_conflict;
}

/**
 * 多特定组合联合排除
 * 1. 获取所有特定组合
 * 2. 标记每个区域的格子属于哪些宫/行/列
 * 3. 找出有共同宫/行/列的两个区域，合并格子和数字，作为一个新的特定组合进行检测
 */
function check_multi_special_combination_region_elimination(board, size, nat = 1) {
    // 1. 获取所有可参与合并的特定组合
    const regions = get_special_combination_regions(board, size, state.current_mode)
        .filter(region => region.type !== '单格特定组合');
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;

            if (intersection.length > 0) {
                // 5. 合并格子和数字，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];
                // const merged_nums = [
                //     ...regions[i].clue_nums,
                //     ...regions[j].clue_nums
                // ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用已有的排除函数
                const changed = special_combination_region_elimination(
                    board,
                    size,
                    merged_cells,
                    // merged_nums,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return; // 只要有变化就返回
            }
        }
    }
    return false;
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
function region_block_elimination(board, size, region_cells, region_type, region_index, classic, nat = 2, num = null) {
    let changed = false;
    // 如果提供了 num 参数，则只检测该数字
    const start = num || 1;
    const end = num || size;
    for (let num = start; num <= end; num++) {
        // 收集该区域内num的所有候选格
        const candidate_positions = [];
        for (const [r, c] of region_cells) {
            const cell = board[r][c];
            if (Array.isArray(cell) && cell.includes(num)) {
                candidate_positions.push([r, c]);
            }
        }
        if (candidate_positions.length < 2) continue;

        // 如果指定了 target_nat，只处理符合条件的区块
        if (nat !== null && candidate_positions.length !== nat) continue;

        // 对每个候选格，模拟eliminate_candidates，收集所有能删到的位置和数字
        const elimination_maps = [];
        for (const [r, c] of candidate_positions) {
            // // 备份分值状态
            // const backup_score = JSON.parse(JSON.stringify(state.candidate_elimination_score));
            // const backup_total = state.total_score_sum;

            // 复制board，模拟填入num
            const board_copy = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
            const original_candidates = Array.isArray(board[r][c]) ? [...board[r][c]] : [];
            board_copy[r][c] = num;
            // const eliminations = eliminate_candidates(board_copy, size, r, c, num, false);
            // 根据classic参数选择调用的函数
            const eliminations = classic 
                ? eliminate_candidates_classic(board_copy, size, r, c, num, false)
                : eliminate_candidates(board_copy, size, r, c, num, false);

            const eliminated_map = new Map();

            // 把“模拟格自身固定为 num 后删去其他候选”也计入本次模拟删数集合。
            // 这样在后续取交集时，这部分信息也会被纳入统一处理。
            if (original_candidates.length > 0) {
                const self_deleted = original_candidates.filter(candidate_num => candidate_num !== num);
                if (self_deleted.length > 0) {
                    const self_key = `${r},${c}`;
                    eliminated_map.set(self_key, new Set(self_deleted));
                }
            }

            for (const elim of eliminations) {
                const deleted_nums = [];
                if (Array.isArray(elim.eliminated) && elim.eliminated.length > 0) {
                    deleted_nums.push(...elim.eliminated);
                }
                if (typeof elim.val === 'number') {
                    deleted_nums.push(elim.val);
                }
                if (deleted_nums.length === 0) continue;

                const posKey = `${elim.row},${elim.col}`;
                if (!eliminated_map.has(posKey)) eliminated_map.set(posKey, new Set());
                for (const n of deleted_nums) {
                    eliminated_map.get(posKey).add(n);
                }
            }
            elimination_maps.push(eliminated_map);

            // // 恢复分值状态
            // state.candidate_elimination_score = JSON.parse(JSON.stringify(backup_score));
            // state.total_score_sum = backup_total;
        }

        // 计算所有模拟结果的交集
        const intersection_map = new Map();
        const all_keys = new Set();
        for (const eliminated_map of elimination_maps) {
            for (const key of eliminated_map.keys()) {
                all_keys.add(key);
            }
        }

        for (const key of all_keys) {
            let intersection = null;
            for (const eliminated_map of elimination_maps) {
                const nums = eliminated_map.has(key) ? Array.from(eliminated_map.get(key)) : [];
                if (intersection === null) {
                    intersection = new Set(nums);
                } else {
                    intersection = new Set([...intersection].filter(x => nums.includes(x)));
                }
            }
            if (intersection && intersection.size > 0) {
                intersection_map.set(key, [...intersection]);
            }
        }

        // // 排除本身候选格
        // for (const [r, c] of candidate_positions) {
        //     intersection_map.delete(`${r},${c}`);
        // }
        if (intersection_map.size === 0) continue;

        const implicit_payload = {
            kind: 'block',
            regionType: region_type,
            regionIndex: region_index,
            numbers: [num],
            nat,
            classic: !!classic
        };
        if (!is_replay_context_allowed(implicit_payload)) {
            continue;
        }

        let score_sum = 1;
        if (!state.silentMode) {
            // 计算本区域该数所有候选格的分值总和
            
            for (const [r, c] of region_cells) {
                const key = `${r},${c},${num}`;
                const score = state.candidate_elimination_score[key] || 0;
                if (score > 0) {
                    score_sum += 1 / score;
                    // log_process(`候选数分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${score_sum}`);
                }
            }
            score_sum = score_sum * candidate_positions.length;
            score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
            // score_sum += (size - candidate_positions.length) * candidate_positions.length;
            // score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
        }

        // 真正执行删除
        const eliminated_cells = [];
        const eliminated_num_to_cells = new Map();
        for (const [pos, nums] of intersection_map.entries()) {
            const [r, c] = pos.split(',').map(Number);
            if (!Array.isArray(board[r][c])) continue;

            const before_arr = board[r][c];
            const before = before_arr.length;
            board[r][c] = board[r][c].filter(n => !nums.includes(n));
            const actually_deleted = before_arr.filter(n => !board[r][c].includes(n));
            if (board[r][c].length < before && actually_deleted.length > 0) {
                changed = true;
                const cell = `${getRowLetter(r+1)}${c+1}`;
                eliminated_cells.push(cell);

                if (!state.silentMode) {
                    for (const deleted_num of actually_deleted) {
                        const key = `${r},${c},${deleted_num}`;
                        if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                        state.candidate_elimination_score[key] += 1 / score_sum;
                    }
                }

                for (const deleted_num of actually_deleted) {
                    if (!eliminated_num_to_cells.has(deleted_num)) {
                        eliminated_num_to_cells.set(deleted_num, new Set());
                    }
                    eliminated_num_to_cells.get(deleted_num).add(cell);
                }
            }
        }
        if (changed) {
            state.implicit_last_application = clone_implicit_payload(implicit_payload);
            const block_cells = candidate_positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
            const prefix = classic ? '' : '变型';
            const elimination_clauses = [...eliminated_num_to_cells.keys()]
                .sort((a, b) => a - b)
                .map(deleted_num => {
                    const cells = [...eliminated_num_to_cells.get(deleted_num)];
                    const in_all_cells = cells.length === eliminated_cells.length && eliminated_cells.every(cell => eliminated_num_to_cells.get(deleted_num).has(cell));
                    if (in_all_cells) {
                        return `删去${deleted_num}`;
                    }
                    return `${cells.join('、')}删去${deleted_num}`;
                });
            const has_global_clause = elimination_clauses.some(clause => clause.startsWith('删去'));
            const position_prefix = has_global_clause ? `，${eliminated_cells.join('、')}` : '';
            // const nat = candidate_positions.length; // 组成区块的数字占用的格子数
            if (!state.silentMode) log_process(`[${prefix}${region_type}区块_${nat}] 第${region_index}${region_type} ${block_cells}构成${num}区块${position_prefix}${elimination_clauses.join('，')}，分值=${score_sum}`);
            return true;
        }
    }
    return false;
}

// 宫区块排除
function check_box_block_elimination(board, size, nat = 2, classic = true) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '宫') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
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
function check_Row_Col_Block_Elimination(board, size, nat = 2, classic = true) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    // 普通模式下，直接用统一区域生成
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '行' || region.type === '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
        }
    }
    return has_conflict;
}

// 额外区域区块排除（主对角线、副对角线，统一用region_block_elimination处理）
function check_Extra_Region_Block_Elimination(board, size, nat = 2, classic = true) {
    // 用统一区域生成方式处理额外区域区块
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_block_elimination(board, size, region.cells, region.type, region.index, classic, nat)) return;
        }
    }
}

/**
 * 特定组合核心删数函数（带日志和区块信息）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域四个格子的坐标
 * @param {Array<number>} clue_nums - 区域的四个数字
 * @param {string} region_type - 区域类型（如 '特定组合'）
 * @param {number} region_index - 区域编号
 * @returns {boolean} 是否有变化
 */
// 变型特定组合区块排除
function special_combination_region_block_elimination(board, size, region_cells, region_type, region_index, nat) {
    let changed = false;

    // 1. 找到未确定格子，并按候选数数量升序排序
    const unknown_indices = [];
    for (let i = 0; i < region_cells.length; i++) {
        const [r, c] = region_cells[i];
        if (Array.isArray(board[r][c])) {
            unknown_indices.push(i);
        }
    }
    
    if (unknown_indices.length === 0) return false;

    // 优化：按候选数数量排序
    unknown_indices.sort((a, b) => {
        const [r1, c1] = region_cells[a];
        const [r2, c2] = region_cells[b];
        return board[r1][c1].length - board[r2][c2].length;
    });

    const board_clone = board.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
    const path = new Array(unknown_indices.length);
    const elimination_sets = [];

    function dfs(depth) {
        if (depth === unknown_indices.length) {
            // 暂时关闭：模拟填入后的冲突检测（某宫/行/列某数字无处可填、某格无候选）。
            // if (!passes_special_combination_post_simulation_checks(board_clone, size, region_cells, unknown_indices, path)) {
            //     return;
            // }
            // 找到一个合法解，计算该解下的排除情况
            const board_copy = board_clone.map(row => row.map(cell => Array.isArray(cell) ? [...cell] : cell));
            const eliminated_map = new Map();

            for (let d = 0; d < unknown_indices.length; d++) {
                const idx = unknown_indices[d];
                const [r, c] = region_cells[idx];
                const num = path[d];
                const original_candidates = Array.isArray(board[r][c]) ? [...board[r][c]] : [];
                
                // 模拟填入并获取排除结果
                const eliminations = eliminate_candidates(board_copy, size, r, c, num, false);
                // if (!state.silentMode) {
                //     log_process(`[${region_type}区块排除_${nat}] 模拟填入${getRowLetter(r + 1)}${c + 1}=${num} eliminations=${JSON.stringify(eliminations)}`);
                // }

                // 与变型宫/行列区块一致：模拟填入后，本格其余候选也视为被删去。
                if (original_candidates.length > 0) {
                    const self_deleted = original_candidates.filter(candidate_num => candidate_num !== num);
                    if (self_deleted.length > 0) {
                        const self_key = `${r},${c}`;
                        if (!eliminated_map.has(self_key)) eliminated_map.set(self_key, new Set());
                        for (const n of self_deleted) {
                            eliminated_map.get(self_key).add(n);
                        }
                    }
                }

                for (const elim of eliminations) {
                    const deleted_nums = [];
                    if (Array.isArray(elim.eliminated) && elim.eliminated.length > 0) {
                        deleted_nums.push(...elim.eliminated);
                    }
                    if (typeof elim.val === 'number') {
                        deleted_nums.push(elim.val);
                    }
                    if (deleted_nums.length === 0) continue;
                    const posKey = `${elim.row},${elim.col}`;
                    if (!eliminated_map.has(posKey)) eliminated_map.set(posKey, new Set());
                    for (const n of deleted_nums) {
                        eliminated_map.get(posKey).add(n);
                    }
                }
            }

            elimination_sets.push(eliminated_map);
            return;
        }

        const idx = unknown_indices[depth];
        const [r, c] = region_cells[idx];
        const candidates = board[r][c];

        for (const num of candidates) {
            const prev = board_clone[r][c];
            board_clone[r][c] = num;

            if (isValid(board_clone, size, r, c, num)) {
                path[depth] = num;
                dfs(depth + 1);
            }

            board_clone[r][c] = prev;
        }
    }

    dfs(0);
    if (elimination_sets.length === 0) return false;

    // 计算所有解的排除交集
    const intersection_map = new Map();
    const all_keys = new Set();
    for (const eliminated_map of elimination_sets) {
        for (const key of eliminated_map.keys()) {
            all_keys.add(key);
        }
    }

    for (const key of all_keys) {
        let intersection = null;
        for (const eliminated_map of elimination_sets) {
            const nums = eliminated_map.has(key) ? Array.from(eliminated_map.get(key)) : [];
            if (intersection === null) {
                intersection = new Set(nums);
            } else {
                intersection = new Set([...intersection].filter(x => nums.includes(x)));
            }
        }
        if (intersection && intersection.size > 0) {
            intersection_map.set(key, [...intersection]);
        }
    }

    if (intersection_map.size === 0) return false;

    const implicit_payload = {
        kind: 'special_combination_block',
        regionType: region_type,
        regionIndex: region_index,
        numbers: [...new Set(
            Array.from(intersection_map.values()).flat()
        )].sort((a, b) => a - b),
        nat
    };
    if (!is_replay_context_allowed(implicit_payload)) {
        return false;
    }

    // 执行排除
    const eliminated_cells = [];
    const eliminated_num_to_cells = new Map();
    for (const [pos, nums] of intersection_map.entries()) {
        const [r, c] = pos.split(',').map(Number);
        if (!Array.isArray(board[r][c])) continue;

        const before_arr = board[r][c];
        const before = before_arr.length;
        board[r][c] = board[r][c].filter(n => !nums.includes(n));
        const actually_deleted = before_arr.filter(n => !board[r][c].includes(n));
        if (board[r][c].length < before && actually_deleted.length > 0) {
            changed = true;
            const cell = `${getRowLetter(r+1)}${c+1}`;
            eliminated_cells.push(cell);
            for (const n of actually_deleted) {
                if (!eliminated_num_to_cells.has(n)) {
                    eliminated_num_to_cells.set(n, new Set());
                }
                eliminated_num_to_cells.get(n).add(cell);
            }
        }
    }

    if (changed) {
        state.implicit_last_application = clone_implicit_payload(implicit_payload);
    }

    if (changed && eliminated_cells.length > 0 && !state.silentMode) {
        const elimination_clauses = [...eliminated_num_to_cells.keys()]
            .sort((a, b) => a - b)
            .map(num => {
                const cells = [...eliminated_num_to_cells.get(num)];
                const in_all_cells = cells.length === eliminated_cells.length && eliminated_cells.every(cell => eliminated_num_to_cells.get(num).has(cell));
                if (in_all_cells) {
                    return `删去${num}`;
                }
                return `${cells.join('、')}删去${num}`;
            });
        const has_global_clause = elimination_clauses.some(clause => clause.startsWith('删去'));
        const position_prefix = has_global_clause ? `${eliminated_cells.join('、')}` : '';
        log_process(`[${region_type}区块_${nat}] ${region_index}${region_type}构成区块，${position_prefix}${elimination_clauses.join('，')}`);
    }

    return changed;
}

function check_special_combination_region_block_elimination(board, size, nat = 1) {
    let has_conflict = false;
    const regions = get_special_combination_regions(board, size, state.current_mode);
    for (const region of regions) {
        if (is_block_special_combination_region_type(region.type)) {
            // 统计区域内未确定的格子数量
            const uncertain_cells = region.cells.filter(([r, c]) => Array.isArray(board[r][c]));
            if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

            // log_process(`[特定组合区块排除] 检查第${region.index}特定组合，数字${region.clue_nums.join('、')}`);
            // if (special_combination_region_block_elimination(board, size, region.cells, region.clue_nums, region.type, region.index)) return;
            if (special_combination_region_block_elimination(board, size, region.cells, region.type, region.index, nat)) return;
        }
    }
    return has_conflict;
}

/**
 * 多特定组合区块排除
 * 1. 获取所有特定组合
 * 2. 标记每个区域的格子属于哪些宫/行/列
 * 3. 找出有共同宫/行/列的两个区域，合并格子和数字，作为一个新的特定组合进行区块排除
 */
function check_multi_special_combination_region_block_elimination(board, size, nat = 1) {
    // 1. 获取所有可参与合并的特定组合
    const regions = get_special_combination_regions(board, size, state.current_mode)
        .filter(region => region.type !== '单格特定组合');
    if (regions.length < 2) return false;

    // 2. 获取所有宫/行/列区域
    const all_regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type === '宫' || r.type === '行' || r.type === '列');

    // 3. 标记每个特定组合的格子属于哪些宫/行/列
    // 结构：region_index -> Set(区域唯一key)
    const region_area_map = [];
    for (const region of regions) {
        const area_set = new Set();
        for (const [r, c] of region.cells) {
            for (const area of all_regions) {
                if (area.cells.some(([ar, ac]) => ar === r && ac === c)) {
                    area_set.add(`${area.type}_${area.index}`);
                }
            }
        }
        region_area_map.push(area_set);
    }

    // 4. 找出有共同宫/行/列的两个特定组合
    for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
            // 判断是否有共同区域
            const setA = region_area_map[i];
            const setB = region_area_map[j];
            const intersection = [...setA].filter(x => setB.has(x));
            // 新增条件：如果两个特定组合之间有共同格子，则跳过
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const has_common_cells = [...set1].some(cell => set2.has(cell));
            if (has_common_cells) continue;
            
            if (intersection.length > 0) {
                // 5. 合并格子和数字，作为一个新的特定组合
                const merged_cells = [
                    ...regions[i].cells,
                    ...regions[j].cells
                ];
                // const merged_nums = [
                //     ...regions[i].clue_nums,
                //     ...regions[j].clue_nums
                // ];

                // 统计未确定的格子数量
                const uncertain_cells = merged_cells.filter(([r, c]) => Array.isArray(board[r][c]));
                if (uncertain_cells.length !== nat) continue; // 仅处理符合 nat 的区域

                // 6. 调用已有的区块排除函数
                const changed = special_combination_region_block_elimination(
                    board,
                    size,
                    merged_cells,
                    // merged_nums,
                    '多特定组合',
                    `${regions[i].index}+${regions[j].index}`,
                    nat
                );
                if (changed) return; // 只要有变化就返回
            }
        }
    }
    return false;
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

        // 行限制
        if (region1_rows.size <= 2 && region2_rows.size <= 2) {
            const target_rows = new Set([...region1_rows, ...region2_rows]);
            if (target_rows.size <= 2) {
                const implicit_payload = {
                    kind: 'pair_block',
                    regionType: `${region1_type}-${region2_type}`,
                    regionIndex: `${region1_index}+${region2_index}`,
                    numbers: [num],
                    axis: 'row'
                };
                if (is_replay_context_allowed(implicit_payload)) {
                    const excluded_positions = [];
                    for (const row of target_rows) {
                        for (let col = 0; col < size; col++) {
                            if (!region1_candidates.some(([r, c]) => r === row && c === col) &&
                                !region2_candidates.some(([r, c]) => r === row && c === col)) {
                                const cell = board[row][col];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[row][col] = cell.filter(n => n !== num);
                                    excluded_positions.push([row, col]);
                                    changed = true;
                                }
                            }
                        }
                    }
                    if (changed && excluded_positions.length > 0) {
                        state.implicit_last_application = clone_implicit_payload(implicit_payload);

                        let score_sum = 0;
                        if (!state.silentMode) {
                            // 分值计算
                            
                            let score_sum1 = 1;
                            let score_sum2 = 1;
                            // 只统计两个区域内的候选格
                            for (const [r, c] of region1_cells) {
                                const key = `${r},${c},${num}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum1 += 1 / score;
                                    // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                                }
                            }
                            score_sum1 = score_sum1 * region1_candidates.length;
                            for (const [r, c] of region2_cells) {
                                const key = `${r},${c},${num}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum2 += 1 / score;
                                    // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                                }
                            }
                            score_sum2 = score_sum2 * region2_candidates.length;
                            score_sum = score_sum1 + score_sum2;
                            score_sum = Math.round(score_sum * 100) / 100;

                            // 给被删掉的候选数加分
                            for (const [row, col] of excluded_positions) {
                                const key = `${row},${col},${num}`;
                                if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                                state.candidate_elimination_score[key] += 1 / score_sum;
                            }
                        }

                        const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        const excluded_cells_str = excluded_positions.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        if (!state.silentMode) {
                            log_process(`[${region1_type}-${region2_type}组合区块] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在行${[...target_rows].map(r => getRowLetter(r + 1)).join('、')}，删除${excluded_cells_str}的${num}，分值=${score_sum}`);
                        }
                        return true;
                    }
                }
            }
        }

        // 列限制
        if (region1_cols.size <= 2 && region2_cols.size <= 2) {
            const target_cols = new Set([...region1_cols, ...region2_cols]);
            if (target_cols.size <= 2) {
                const implicit_payload = {
                    kind: 'pair_block',
                    regionType: `${region1_type}-${region2_type}`,
                    regionIndex: `${region1_index}+${region2_index}`,
                    numbers: [num],
                    axis: 'col'
                };
                if (is_replay_context_allowed(implicit_payload)) {
                    const excluded_positions = [];
                    for (const col of target_cols) {
                        for (let row = 0; row < size; row++) {
                            if (!region1_candidates.some(([r, c]) => r === row && c === col) &&
                                !region2_candidates.some(([r, c]) => r === row && c === col)) {
                                const cell = board[row][col];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[row][col] = cell.filter(n => n !== num);
                                    excluded_positions.push([row, col]);
                                    changed = true;
                                }
                            }
                        }
                    }
                    if (changed && excluded_positions.length > 0) {
                        state.implicit_last_application = clone_implicit_payload(implicit_payload);

                        let score_sum = 0;
                        if (!state.silentMode) {    
                            // 分值计算
                            
                            let score_sum1 = 1;
                            let score_sum2 = 1;
                            // 只统计两个区域内的候选格
                            for (const [r, c] of region1_cells) {
                                const key = `${r},${c},${num}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum1 += 1 / score;
                                    // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                                }
                            }
                            score_sum1 = score_sum1 * region1_candidates.length;
                            for (const [r, c] of region2_cells) {
                                const key = `${r},${c},${num}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum2 += 1 / score;
                                    // log_process(`考虑分值: [${getRowLetter(r + 1)}${c + 1}] 候选${num} -> 分值=${1 / score}`);
                                }
                            }
                            score_sum2 = score_sum2 * region2_candidates.length;
                            score_sum = score_sum1 + score_sum2;
                            score_sum = Math.round(score_sum * 100) / 100;

                            // 给被删掉的候选数加分
                            for (const [row, col] of excluded_positions) {
                                const key = `${row},${col},${num}`;
                                if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                                state.candidate_elimination_score[key] += 1 / score_sum;
                                // log_process(`给${getRowLetter(row + 1)}${col + 1}的${num}加分，当前分值=${state.candidate_elimination_score[key]}`);
                            }
                        }

                        const region1_cells_str = region1_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        const region2_cells_str = region2_candidates.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        const excluded_cells_str = excluded_positions.map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`).join('、');
                        if (!state.silentMode) {
                            log_process(`[${region1_type}-${region2_type}组合区块] 第${region1_index}${region1_type}(${region1_cells_str})与第${region2_index}${region2_type}(${region2_cells_str})的${num}候选数限制在列${[...target_cols].map(c => c + 1).join('、')}，删除${excluded_cells_str}的${num}，分值=${score_sum}`);
                        }
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
// ...existing code...

/**
 * 宫组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @returns {boolean} 是否有变化
 */
function check_box_pair_block_elimination(board, size) {
    let has_conflict = false;
    // 用get_all_regions生成所有宫区域
    const regions = get_all_regions(size, state.current_mode).filter(r => r.type === '宫');
    for (let i = 0; i < regions.length; i++) {
        if (!can_apply_region_elimination(board, size, regions[i].cells)) continue;
        for (let j = i + 1; j < regions.length; j++) {
            if (!can_apply_region_elimination(board, size, regions[j].cells)) continue;
            if (region_pair_block_elimination(
                board,
                size,
                regions[i].cells,
                regions[j].cells,
                '宫',
                regions[i].index,
                '宫',
                regions[j].index
            )) {
                return;
            }
        }
    }
    return false;
}

/**
 * 额外区域组合区块排除
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @returns {boolean} 是否有变化
 */
function check_extra_region_pair_block_elimination(board, size) {
    let has_conflict = false;
    // 获取所有非行/列的区域（即变型区域）
    const regions = get_all_regions(size, state.current_mode)
        .filter(r => r.type !== '行' && r.type !== '列');
    for (let i = 0; i < regions.length; i++) {
        const regA = regions[i];
        // 区域必须为数组
        if (!Array.isArray(regA.cells)) continue;
        if (!can_apply_region_elimination(board, size, regA.cells)) continue;

        for (let j = i + 1; j < regions.length; j++) {
            const regB = regions[j];
            // 区域必须为数组
            if (!Array.isArray(regB.cells)) continue;
            if (!can_apply_region_elimination(board, size, regB.cells)) continue;
            // 限制条件：两个区域的候选格不能有重叠
            const set1 = new Set(regions[i].cells.map(([r, c]) => `${r},${c}`));
            const set2 = new Set(regions[j].cells.map(([r, c]) => `${r},${c}`));
            const overlap = [...set1].some(pos => set2.has(pos));
            if (overlap) continue;
            if (region_pair_block_elimination(
                board,
                size,
                regions[i].cells,
                regions[j].cells,
                regions[i].type,
                regions[i].index,
                regions[j].type,
                regions[j].index
            )) {
                return;
            }
        }
    }
    return false;
}

/**
 * 通用区域显性数对组排除（支持 2..9）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {number} subset_size - 显性数对组大小（2..9）
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
    // 只保留候选数少于或等于 subset_size 的格子
    const filtered_candidates = candidates.filter(c => c.nums.length <= subset_size);
    // 枚举所有 subset_size 个格子的组合
    const combinations = getCombinations(filtered_candidates, subset_size);

    for (const combo of combinations) {
        // 合并所有候选数
        const union_nums = [...new Set(combo.flatMap(c => c.nums))].sort((a, b) => a - b);
        if (union_nums.length === subset_size) {
            const implicit_payload = {
                kind: 'naked_subset',
                regionType: region_type,
                regionIndex: region_index,
                numbers: union_nums,
                subsetSize: subset_size
            };
            if (!is_replay_context_allowed(implicit_payload)) {
                continue;
            }

            let affected_cells = [];
            // 先尝试删数
            // 记录每个格子被删掉的数字
            const deleted_map = new Map();
            for (const cell of candidates) {
                if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                    const original_length = cell.nums.length;
                    const deleted_nums = cell.nums.filter(n => union_nums.includes(n));
                    if (deleted_nums.length > 0) {
                        deleted_map.set(`${cell.pos[0]},${cell.pos[1]}`, deleted_nums);
                    }
                    cell.nums = cell.nums.filter(n => !union_nums.includes(n));
                    board[cell.pos[0]][cell.pos[1]] = cell.nums;
                    if (cell.nums.length < original_length) {
                        affected_cells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                    }
                }
            }
            // 只有真的删数后才计算分值和加分
            if (affected_cells.length > 0) {
                state.implicit_last_application = clone_implicit_payload(implicit_payload);

                let score_sum = 0;
                if (!state.silentMode) {    
                    // 分值计算
                    
                    for (const c of combo) {
                        const [r, col] = c.pos;
                        for (let other = 1; other <= size; other++) {
                            if (!union_nums.includes(other)) {
                                const key = `${r},${col},${other}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum += 1 / score;
                                }
                            }
                        }
                    }
                    score_sum *= (candidates.length - combo.length) * combo.length;
                    score_sum = Math.round(score_sum * 100) / 100;
        
                    // 给被删掉的数字加分
                    for (const [pos, deleted_nums] of deleted_map.entries()) {
                        const [row, col] = pos.split(',').map(Number);
                        for (const n of deleted_nums) {
                            const key = `${row},${col},${n}`;
                            if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                            state.candidate_elimination_score[key] += 1 / score_sum;
                            // log_process(`    候选数 ${getRowLetter(row+1)}${col+1} 的 ${n} 分值贡献 +${(1/score_sum).toFixed(2)}`);
                        }
                    }
                }

                const subset_name = `数对组_${subset_size}`;
                const subset_cells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                if (!state.silentMode) log_process(`[${region_type}显性${subset_name}] 第${region_index}${region_type}的${subset_cells}构成${subset_name}${union_nums.join('')}，排除${affected_cells.join('、')}的${union_nums.join('、')}，分值=${score_sum}`);
                return true;
            }
        }
    }
    // ...existing code...
    // ...existing code...
    return false;
}

// 宫显性数对组（可指定子集大小：2..9）
// 只删除宫内其他格的候选数，调用通用核心函数
function check_box_naked_subset_elimination(board, size, subset_size = 2) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '宫') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 行列显性数对组（可指定子集大小：2..9）
// 只删除本行/本列其他格的候选数，调用通用核心函数
function check_row_col_naked_subset_elimination(board, size, subset_size = 2) {
    let has_conflict = false;
    // 用统一区域生成方式处理行列
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '行' || region.type === '列') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 额外区域显性数对组（可指定子集大小：2..9）
// 只删除对角线内其他格的候选数，调用通用核心函数
function check_extra_region_naked_subset_elimination(board, size, subset_size = 2) {
    // 用统一区域生成方式处理对角线
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            if (region_naked_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return false;
}

/**
 * 通用隐性数对组核心函数（支持 2..9）
 * @param {Array<Array>} board - 数独盘面
 * @param {number} size - 盘面大小
 * @param {Array<[number, number]>} region_cells - 区域所有格子的 [row, col] 坐标数组
 * @param {number} subset_size - 隐性数对组大小（2..9）
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
    const filtered_nums = nums.filter(num => {
        let count = 0;
        for (const [r, c] of candidate_cells) {
            if (board[r][c].includes(num)) count++;
        }
        return count <= subset_size && count > 0;
    });
    const num_combinations = getCombinations(filtered_nums, subset_size);

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
            const implicit_payload = {
                kind: 'hidden_subset',
                regionType: region_type,
                regionIndex: region_index,
                numbers: num_group,
                subsetSize: subset_size
            };
            if (!is_replay_context_allowed(implicit_payload)) {
                continue;
            }

            // // 检查这些格子是否都包含这些数字（可选，严格可不加）
            // let is_subset = true;
            // for (const [r, c] of positions) {
            //     if (!num_group.every(n => board[r][c].includes(n))) {
            //         is_subset = false;
            //         break;
            //     }
            // }
            // if (is_subset) {
                let modified = false;
                let deleted_cells = [];
                let deleted_detail = [];

                let score_sum = 0;
                if (!state.silentMode) {    
                    // 分值计算：加区域内其他格子（不在positions内）对应数对组中数字的分值
                    
                    for (const [r, c] of region_cells) {
                        // 跳过隐性数组本身的格子
                        if (positions.some(([pr, pc]) => pr === r && pc === c)) continue;
                        if (Array.isArray(board[r][c])) {
                            for (const n of num_group) {
                                const key = `${r},${c},${n}`;
                                const score = state.candidate_elimination_score[key] || 0;
                                if (score > 0) {
                                    score_sum += 1 / score;
                                }
                            }
                        }
                    }
                    score_sum *= (candidate_cells.length - positions.length) * positions.length;
                    score_sum = Math.round(score_sum * 100) / 100; // 保留两位小数
                }

                // 删除隐性数对组格子中非 num_group 的数字，并给被删掉的数字加分
                for (const [r, c] of positions) {
                    const before = board[r][c].length;
                    const deleted = board[r][c].filter(n => !num_group.includes(n));
                    board[r][c] = board[r][c].filter(n => num_group.includes(n));
                    if (board[r][c].length < before && deleted.length > 0) {
                        modified = true;
                        deleted_cells.push(`${getRowLetter(r+1)}${c+1}`);
                        deleted_detail.push(`${getRowLetter(r+1)}${c+1}的${deleted.join('、')}`);
                        if (!state.silentMode) {    
                            // 分值加到被删掉的数字上
                            for (const n of deleted) {
                                const key = `${r},${c},${n}`;
                                if (!state.candidate_elimination_score[key]) state.candidate_elimination_score[key] = 0;
                                state.candidate_elimination_score[key] += 1 / score_sum;
                            }
                        }
                    }
                }
                if (modified) {
                    state.implicit_last_application = clone_implicit_payload(implicit_payload);

                    const subset_name = `数对组_${subset_size}`;
                    const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                    let detail_msg = deleted_detail.length > 0 ? `，删除${deleted_detail.join('，')}` : '';
                    if (!state.silentMode) {
                        log_process(`[${region_type}隐性${subset_name}] ${cells}构成隐性${subset_name}${num_group.join('')}${detail_msg}，分值=${score_sum}`);
                    }
                    return true;
                }
            // }
        }
    }
    return has_conflict;
}

// 宫隐性数对组
function check_box_hidden_subset_elimination(board, size, subset_size = 2) {
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let has_conflict = false;

    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '宫') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 行列隐性数对组
function check_row_col_hidden_subset_elimination(board, size, subset_size = 2) {
    let has_conflict = false;

    // 用统一区域生成方式处理行列
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type === '行' || region.type === '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return has_conflict;
}

// 额外区域隐性数对组
function check_extra_region_hidden_subset_elimination(board, size, subset_size = 2) {
    // 用统一区域生成方式处理所有非宫/行/列的区域
    const regions = get_all_regions(size, state.current_mode);
    for (const region of regions) {
        if (region.type !== '宫' && region.type !== '行' && region.type !== '列') {
            if (!can_apply_region_elimination(board, size, region.cells)) continue;
            if (region_hidden_subset_elimination(board, size, region.cells, subset_size, region.type, region.index)) return;
        }
    }
    return false;
}

function format_algebra_region_desc(region) {
    if (!region) {
        return '';
    }
    const region_index = region.index ?? '';
    return region_index === ''
        ? `${region.type}`
        : `${region_index}${region.type}`;
}

function find_algebra_single_candidate_regions(board, regions, num) {
    const single_candidate_regions = [];

    for (const region of regions) {
        let has_fixed_num = false;
        const candidate_cells = [];

        for (const [r, c] of region.cells) {
            const cell = board[r][c];
            if (cell === num) {
                has_fixed_num = true;
                break;
            }
            if (Array.isArray(cell) && cell.includes(num)) {
                candidate_cells.push([r, c]);
            }
        }

        if (has_fixed_num) {
            continue;
        }

        if (candidate_cells.length === 1) {
            single_candidate_regions.push({
                region,
                cell: candidate_cells[0],
            });
        }
    }

    return single_candidate_regions;
}