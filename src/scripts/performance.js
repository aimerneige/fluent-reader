"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLowPerformance = applyLowPerformance;
function applyLowPerformance(flag) {
    if (flag === undefined || flag === null) {
        flag = window.settings.getLowPerformance();
    }
    document.body.classList.toggle("perf-low", flag);
}
