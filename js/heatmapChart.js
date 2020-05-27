var heatmapChart = function () {
  let margin = {top: 20, right: 20, bottom: 20, left: 20};
  let width = 960 - margin.left - margin.right;
  let height = 500 - margin.top - margin.bottom;

  var highlightStrings = [];
  var chartData;
  var chartDiv;

  let x;
  let y;
  const formatDate = d3.timeFormat("%Y %b");

  function chart(selection, data) {
    chartData = data;
    chartDiv = selection;
    drawChart();
  }

  function drawChart() {
    if (chartDiv) {
      chartDiv.selectAll('*').remove();
    }

    if (chartData) {
      console.log(`height: ${height}`);
      console.log(`width: ${width}`);

      const svg = chartDiv.append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append('svg:g')
          .attr("transform", `translate(${margin.left},${margin.top})`);

      console.log(chartData);
      x = d3.scaleBand()
        .domain(chartData.dates)
        .range([0, width]);
      // console.log(x.domain());
      // console.log(x.range());
      // console.log(`${chartData.dates[0]} is at ${x(chartData.dates[0])}`);

      y = d3.scaleBand()
        .domain(chartData.rows.map(d => d.name))
        .range([0, height]);

      // const color = d3.scaleSequentialSqrt([d3.max(chartData.rows, d => d3.max(d.values)), 1], d3.interpolateBuPu);
      const color = d3.scaleSequentialSqrt(t => d3.interpolateOrRd((t + 0.25) / 2))
          .domain([d3.max(chartData.rows, d => d3.max(d.values)), 1]);

      svg.append("g")
        .attr("class", "axis axis--x")
        .call(d3.axisTop(x).tickFormat(d => formatDate(d)))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll('.tick text')
          .attr('y', 0)
          .attr('x', 10)
          .attr('dy', '0.35em')
          .attr("text-anchor", "start")
          .attr('transform', 'rotate(-90)'));

      const truncateName = (name) => {
        if (name.length > 20) {
          return name.substring(0, 20) + "...";
        }
        return name;
      }
      svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove());

      const row = svg.append("g")
          .selectAll("g")
        .data(chartData.rows)
        .join("g")
          .attr("transform", d => `translate(0,${y(d.name)})`)
          .on('mouseover touchover', d => {
            d3.select('.axis--y')
              .selectAll('text')
              .attr('font-weight', t => t === d.name ? "bold" : null);
          })
          .on('mouseout touchout', d => {
            d3.select('.axis--y')
              .selectAll('text')
              .attr('font-weight', null);
          });
      
      row.selectAll("rect")
        .data(d => d.values)
        .join("rect")
          .attr("x", (d, i) => x(chartData.dates[i]))
          .attr("width", x.bandwidth() - 1)
          .attr("height", y.bandwidth() - 1)
          .attr("fill", v => isNaN(v) ? "whitesmoke" : v === 1 ? "red" : color(v))
          // .attr("stroke", v => v === 1 ? "dodgerblue" : null)
          .on('mouseover touchover', (d, i) => {
            d3.select('.axis--x')
              .selectAll('text')
              .attr('font-weight', t => t.getTime() === chartData.dates[i].getTime() ? 'bold' : null);
          })
          .on('mouseout touchout', d => {
            d3.select('.axis--x')
              .selectAll('text')
              .attr('font-weight', null);
          })
        .append("title")
          .text((d, i) => `${d ? `#${d}` : 'No Ranking'} on ${formatDate(chartData.dates[i])}`);
    }
  }

  chart.margin = function(value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right;
    oldChartHeight = height + margin.top + margin.bottom;
    margin = value;
    width = oldChartWidth - margin.left - margin.right;
    height = oldChartHeight - margin.top - margin.bottom;
    drawChart();
    return chart;
  };

  chart.width = function(value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
    drawChart();
    return chart;
  };

  chart.height = function(value) {
    if (!arguments.length) {
      return height;
    }
    height = value - margin.top - margin.bottom;
    drawChart();
    return chart;
  };

  return chart;
}