// Chart options and helper functions for consistent styling

// Generate enhanced chart options with consistent styling
export const getEnhancedChartOptions = (baseOptions = {}) => {
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          labels: {
            ...baseOptions.plugins?.legend?.labels,
            font: {
              family: "'Inter', sans-serif",
              size: 12,
              ...baseOptions.plugins?.legend?.labels?.font
            },
            color: '#e5e7eb',
            usePointStyle: true,
            padding: 15,
            ...baseOptions.plugins?.legend?.labels
          }
        },
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          backgroundColor: 'rgba(24, 24, 24, 0.9)',
          titleFont: {
            family: "'Inter', sans-serif",
            size: 14,
            weight: 'bold',
            ...baseOptions.plugins?.tooltip?.titleFont
          },
          bodyFont: {
            family: "'Inter', sans-serif",
            size: 13,
            ...baseOptions.plugins?.tooltip?.bodyFont
          },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          ...baseOptions.plugins?.tooltip
        }
      },
      scales: baseOptions.scales ? {
        ...baseOptions.scales,
        r: baseOptions.scales.r ? {
          ...baseOptions.scales.r,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            ...baseOptions.scales.r?.grid
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.1)',
            ...baseOptions.scales.r?.angleLines
          },
          pointLabels: {
            font: {
              family: "'Inter', sans-serif",
              size: 11,
              ...baseOptions.scales.r?.pointLabels?.font
            },
            color: '#e5e7eb',
            ...baseOptions.scales.r?.pointLabels
          },
          ...baseOptions.scales.r
        } : undefined,
        x: baseOptions.scales.x ? {
          ...baseOptions.scales.x,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            ...baseOptions.scales.x?.grid
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              ...baseOptions.scales.x?.ticks?.font
            },
            color: '#e5e7eb',
            ...baseOptions.scales.x?.ticks
          },
          ...baseOptions.scales.x
        } : undefined,
        y: baseOptions.scales.y ? {
          ...baseOptions.scales.y,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            ...baseOptions.scales.y?.grid
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              ...baseOptions.scales.y?.ticks?.font
            },
            color: '#e5e7eb',
            ...baseOptions.scales.y?.ticks
          },
          ...baseOptions.scales.y
        } : undefined
      } : undefined
    };
  };
  
  // Generate vibrant but cohesive color schemes
  export const generateChartColors = (count, baseHue = null) => {
    const colors = [];
    const transparentColors = [];
    
    // Use provided base hue or generate a random one
    const startHue = baseHue || Math.floor(Math.random() * 360);
    
    // Golden ratio to space the hues evenly
    const goldenRatioConjugate = 0.618033988749895;
    
    for (let i = 0; i < count; i++) {
      // Use golden ratio to get next hue
      const hue = (startHue + (i * 360 * goldenRatioConjugate)) % 360;
      const saturation = 70 + Math.random() * 10; // 70-80%
      const lightness = 55 + Math.random() * 10;  // 55-65%
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const transparentColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
      
      colors.push(color);
      transparentColors.push(transparentColor);
    }
    
    return { colors, transparentColors };
  };
  
  // Enhanced chart plugins
  export const chartAnimationPlugin = {
    id: 'chartAnimation',
    beforeDraw: (chart) => {
      if (chart.config.options.animation && chart.config.options.animation.onProgress) {
        const progress = chart.animation.currentStep / chart.animation.numSteps;
        chart.config.options.animation.onProgress({ chart, currentStep: chart.animation.currentStep, numSteps: chart.animation.numSteps, progress });
      }
    }
  };
  
  // Enhanced tooltip that follows cursor more smoothly
  export const enhancedTooltipPlugin = {
    id: 'enhancedTooltip',
    beforeEvent(chart, args) {
      const event = args.event;
      if (event.type === 'mousemove') {
        chart.$tooltip = {
          x: event.x,
          y: event.y
        };
      }
    },
    beforeTooltipDraw(chart, args) {
      if (chart.$tooltip) {
        const tooltip = args.tooltip;
        tooltip.x = chart.$tooltip.x;
        tooltip.y = chart.$tooltip.y - 10; // Slight offset above cursor
      }
    }
  };
  
  // Predefined Spotify-themed color palettes
  export const spotifyColorPalettes = {
    // Green-based palette (Spotify's signature)
    green: {
      colors: [
        '#1DB954', // Spotify green
        '#1ED760', // Spotify light green
        '#149442', // Darker green
        '#52D780', // Lighter green
        '#A8E4BC', // Pale green
      ],
      transparentColors: [
        'rgba(29, 185, 84, 0.8)',
        'rgba(30, 215, 96, 0.8)',
        'rgba(20, 148, 66, 0.8)',
        'rgba(82, 215, 128, 0.8)',
        'rgba(168, 228, 188, 0.8)',
      ]
    },
    
    // Purple-blue gradient (for genre analysis)
    genreAnalysis: {
      colors: [
        '#8C1AFF', // Purple
        '#6B46C1', // Indigo
        '#4F46E5', // Blue
        '#3B82F6', // Light blue
        '#60A5FA', // Sky blue
      ],
      transparentColors: [
        'rgba(140, 26, 255, 0.8)',
        'rgba(107, 70, 193, 0.8)',
        'rgba(79, 70, 229, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(96, 165, 250, 0.8)',
      ]
    },
    
    // Red-orange-yellow (for popularity charts)
    popularity: {
      colors: [
        '#EF4444', // Red  
        '#F59E0B', // Amber
        '#FBBF24', // Yellow
        '#10B981', // Emerald
        '#3B82F6', // Blue
      ],
      transparentColors: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(16, 185, 129, 0.8)', 
        'rgba(59, 130, 246, 0.8)',
      ]
    }
  };