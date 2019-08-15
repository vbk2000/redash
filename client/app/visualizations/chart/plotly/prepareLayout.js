import { filter, has, isArray, isNumber, isObject, isUndefined, map, max, min } from 'lodash';
import { getSeriesAxis } from './utils';
import { getPieDimensions } from './preparePieData';

function getAxisTitle(axis) {
  return isObject(axis.title) ? axis.title.text : null;
}

function getAxisScaleType(axis) {
  switch (axis.type) {
    case 'datetime': return 'date';
    case 'logarithmic': return 'log';
    default: return axis.type;
  }
}

function calculateAxisRange(seriesList, minValue, maxValue) {
  if (!isNumber(minValue)) {
    minValue = Math.min(0, min(map(seriesList, series => min(series.y))));
  }
  if (!isNumber(maxValue)) {
    maxValue = max(map(seriesList, series => max(series.y)));
  }
  return [minValue, maxValue];
}

function prepareXAxis(axisOptions, additionalOptions) {
  axisOptions = axisOptions || {};
  const axis = {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
  };

  if (additionalOptions.sortX && axis.type === 'category') {
    if (additionalOptions.reverseX) {
      axis.categoryorder = 'category descending';
    } else {
      axis.categoryorder = 'category ascending';
    }
  }

  if (!isUndefined(axisOptions.labels)) {
    axis.showticklabels = axisOptions.labels.enabled;
  }

  return axis;
}

function prepareYAxis(axisOptions, additionalOptions, data) {
  axisOptions = axisOptions || {};

  const axis = {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
  };

  if (isNumber(axisOptions.rangeMin) || isNumber(axisOptions.rangeMax)) {
    axis.range = calculateAxisRange(data, axisOptions.rangeMin, axisOptions.rangeMax);
  }

  return axis;
}

function preparePieLayout(layout, seriesList, options) {
  const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);

  const { cellsInRow, cellWidth, cellHeight, xPadding } = getPieDimensions(seriesList);

  if (hasName) {
    layout.annotations = [];
  } else {
    layout.annotations = filter(map(seriesList, (series, index) => {
      const xPosition = (index % cellsInRow) * cellWidth;
      const yPosition = Math.floor(index / cellsInRow) * cellHeight;
      return {
        x: xPosition + ((cellWidth - xPadding) / 2),
        y: yPosition + cellHeight - 0.015,
        xanchor: 'center',
        yanchor: 'top',
        text: (options.seriesOptions[series.name] || {}).name || series.name,
        showarrow: false,
      };
    }));
  }

  return layout;
}

function prepareDefaultLayout(layout, seriesList, options, data) {
  const hasY2 = !!find(seriesList, series => getSeriesAxis(series, options) === 'y2');

  layout.xaxis = prepareXAxis(options.xAxis, options);

  if (isArray(options.yAxis)) {
    layout.yaxis = prepareYAxis(options.yAxis[0], options, data.filter(s => s.yaxis !== 'y2'));
    if (hasY2) {
      layout.yaxis2 = prepareYAxis(options.yAxis[1], options, data.filter(s => s.yaxis === 'y2'));
      layout.yaxis2.overlaying = 'y';
      layout.yaxis2.side = 'right';
    }
  }

  if (options.series.stacking) {
    layout.barmode = 'relative';
  }

  return layout;
}

function prepareBoxLayout(layout, seriesList, options, data) {
  layout = prepareDefaultLayout(layout, seriesList, options, data);
  layout.boxmode = 'group';
  layout.boxgroupgap = 0.50;
  return layout;
}

export default function prepareLayout(element, seriesList, options, data) {
  const layout = {
    margin: { l: 10, r: 10, b: 10, t: 25, pad: 4 },
    width: Math.floor(element.offsetWidth),
    height: Math.floor(element.offsetHeight),
    autosize: true,
    showlegend: has(options, 'legend') ? options.legend.enabled : true,
  };

  switch (options.globalSeriesType) {
    case 'pie': return preparePieLayout(layout, seriesList, options, data);
    case 'box': return prepareBoxLayout(layout, seriesList, options, data);
    default: return prepareDefaultLayout(layout, seriesList, options, data);
  }
}
