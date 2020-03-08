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
  elem.parentElement.parentElement.getElementsByClassName('run')[0].setAttribute('id', index);
  console.debug(index);
  var cm = CodeMirror.fromTextArea(elem, {
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    mode: 'json',
    height: 400,
  });
  cm.setSize('100%', 400);
  editors[index] = cm;
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
        chartData = generateMockData(1, {
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
        chartData = generateMockData(30, {
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

function generateMockData(count, fields) {
  var result = [];
  var mapping = {
    // date: faker.date.past,
    name: faker.name.findName,
    gender: faker.name.gender,
    phone: faker.phone.phoneNumber,
    country: faker.address.country,
    city: faker.address.city,
    price: faker.commerce.price,
    number: faker.random.number,
    float: faker.random.float,
    boolean: faker.random.boolean,
    color: faker.internet.color,
    url: faker.internet.url,
    ip: faker.internet.ip,
    username: faker.internet.userName,
    password: faker.internet.password,
    avatar: faker.internet.avatar,
    email: faker.internet.exampleEmail,
  };
  for (var i = 0; i < count; i++) {
    var item = {};
    Object.keys(fields).forEach(function (key) {
      if (fields[key].type) {
        var fn = mapping[fields[key].type];
        if (typeof fn === 'function') {
          item[key] = fn();
        } else if (fields[key].type === 'date') {
          var stamp = parseInt(Date.now());
          item[key] = new Date(stamp - (count - i) * 24 * 60 * 60 * 1000).toLocaleDateString();
        } else {
          item[key] = faker.random.words();
        }
      }
    });
    result.push(item);
  }
  return result;
}