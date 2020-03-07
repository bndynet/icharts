axios.get('../README.md').then(function (response) {
  var converter = new showdown.Converter();
  document.getElementById('readme').innerHTML = converter.makeHtml(response.data);
});

axios.get('../CHANGELOG.md').then(function (response) {
  var converter = new showdown.Converter();
  document.getElementById('changelog-body').innerHTML = converter.makeHtml(response.data);
});

for (var i = 0; i < document.querySelectorAll('.pie').length; i++) {
  new icharts.PieChart(document.querySelectorAll('.pie')[i], {
    title: 'Pie',
    subtitle: 'description for pie chart',
    radius: ['60%', '70%'],
    data: { 'Czech Republic': 123, Ireland: 23, Germany: 2323 },
    legend: {
      show: true,
      left: 0,
      orient: 'vertical',
      top: 0,
      fnLabels: (key, value, percent) => {
        return [key, ` - ${value}(${percent.toFixed(2)}%)`];
      },
      labelStyles: [
        {
          fontSize: 13,
        },
        {
          width: 100,
          textAlign: 'left',
        },
      ],
    },
    // tooltip: {
    //   getContent: (d) => {
    //     return `<b>${d.name}</b>`;
    //   },
    // },
    // colors: {
    //   Ireland: '#ff0000',
    // },
    colors: ['#ff0000', '#00ff00'],
  });
}
