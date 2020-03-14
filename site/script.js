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
  var id = utils.stringUtils.getRandomId();
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
    var chartFn;
    var chartData;
    switch (chartElem.getAttribute('type')) {
      case 'pie':
        chartFn = icharts.PieChart;
        chartData = utils.testUtils.generateMockData(1, {
          Visits: {
            type: 'number',
          },
          Views: {
            type: 'number',
          },
          Hits: {
            type: 'number',
          },
        });
        break;
      case 'xy':
        chartFn = icharts.XYChart;
        chartData = utils.testUtils.generateMockData(30, {
          Date: {
            type: 'date',
          },
          Visits: {
            type: 'number',
          },
          Views: {
            type: 'number',
          },
          Hits: {
            type: 'number',
          },
          S1: {
            type: 'number',
          },
          S2: {
            type: 'number',
          },
          S3: {
            type: 'number',
          },
        });
        break;
    }
    chartOptions.data = chartData;
    new chartFn(chartElem, chartOptions);
  });
  elem.click();
});

var chartElements = document.querySelectorAll('.chart');
for (var i = 0; i < chartElements.length; i++) {
  console.debug(chartElements[i]);
}
