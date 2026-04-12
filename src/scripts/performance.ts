export function applyLowPerformance(flag?: boolean) {
    if (flag === undefined || flag === null) {
        flag = window.settings.getLowPerformance()
    }
    document.body.classList.toggle("perf-low", flag)
}
