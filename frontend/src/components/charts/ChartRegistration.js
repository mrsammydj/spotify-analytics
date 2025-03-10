import { Chart as ChartJS, registerables } from 'chart.js';
import { chartAnimationPlugin, enhancedTooltipPlugin } from './ChartHelpers';

// Register all necessary Chart.js components
ChartJS.register(...registerables);

// Register custom plugins
ChartJS.register(chartAnimationPlugin, enhancedTooltipPlugin);

// Set default options
ChartJS.defaults.font.family = "'Inter', 'Helvetica', 'Arial', sans-serif";
ChartJS.defaults.color = '#e5e7eb';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

// Global tooltip styles
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(24, 24, 24, 0.9)';
ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff';
ChartJS.defaults.plugins.tooltip.bodyColor = '#e5e7eb';
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;

// Export ChartJS instance
export default ChartJS;