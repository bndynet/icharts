axios.get('../README.md').then(function (response) {
  var converter = new showdown.Converter();
  document.getElementById('readme').innerHTML = converter.makeHtml(response.data);
});

axios.get('../CHANGELOG.md').then(function (response) {
  var converter = new showdown.Converter();
  document.getElementById('changelog-body').innerHTML = converter.makeHtml(response.data);
});

var editors = {};

document.querySelectorAll('textarea.code').forEach(function (elem, index) {
  var id = utils.string.getRandomId();
  elem.parentElement.parentElement.getElementsByClassName('run')[0].setAttribute('id', id);
  var cm = CodeMirror.fromTextArea(elem, {
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    mode: 'json',
    height: 400,
  });
  cm.setSize('100%', 400);
  editors[id] = cm;
});

document.querySelectorAll('.run').forEach((elem) => {
  elem.addEventListener('click', () => {
    var chartOptions = {};
    try {
      var cm = editors[elem.getAttribute('id')];
      var opt = JSON.parse(cm.getValue());
      console.debug(opt);
      merge.recursive(chartOptions, opt);
    } catch (err) {
      alert(
        err +
          `
      ${opt}`,
      );
    }
    var chartElem = elem.parentElement.getElementsByClassName('chart')[0];
    var seriesCount = parseInt(chartElem.getAttribute('data-series-count')) || 4;
    var count = parseInt(chartElem.getAttribute('data-length')) || 30;
    var chartFn;
    var chartData;
    switch (chartElem.getAttribute('type')) {
      case 'pie':
        chartFn = icharts.PieChart;
        chartData = dator.generate(1, {
          Visits: {
            type: 'number',
            args: { min: 10, max: 10000 },
          },
          Views: {
            type: 'number',
            args: { min: 10, max: 10000 },
          },
          Hits: {
            type: 'number',
            args: { min: 10, max: 10000 },
          },
        });
        break;
      case 'xy':
        chartFn = icharts.XYChart;
        var seriesDefinition = {};
        for (var i = 0; i < seriesCount; i++) {
          seriesDefinition[`S${i}`] = {
            type: 'number',
            args: { min: 10, max: 10000 },
          };
        }
        chartData = dator.generate(count, {
          Date: {
            type: 'date',
          },
          ...seriesDefinition,
        });
        break;
    }
    if (Array.isArray(chartData)) {
      chartData = chartData.map((item) => {
        item.Date = item.Date.toDateString();
        return item;
      });
    }
    console.debug(chartData);
    chartOptions.data = chartData;
    new chartFn(chartElem, chartOptions);
  });
  elem.click();
});

var chartElements = document.querySelectorAll('.chart');
for (var i = 0; i < chartElements.length; i++) {
  console.debug(chartElements[i]);
}
