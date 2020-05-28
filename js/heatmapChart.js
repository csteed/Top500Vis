var heatmapChart = function () {
  let margin = {top: 20, right: 20, bottom: 20, left: 20};
  let width = 960 - margin.left - margin.right;
  let height = 500 - margin.top - margin.bottom;
  let rowHeight = 12;

  var rowFilterStrings = [];
  var chartRows;
  var chartDates;
  var filteredRows;
  var chartDiv;

  let x;
  let y;
  const formatDate = d3.timeFormat("%Y %b");

  function chart(selection, data) {
    chartDates = data.dates;
    chartRows = data.rows;
    filteredRows = rowFilterStrings.length > 0 ? chartRows.filter(d => isRowShowing(d.name)) : chartRows;
    // filteredChartData = rowFilterStrings.length > 0 ? chartData.filter(d => isRowShowing(d.name)) : chartData;

    chartDiv = selection;
    drawChart();
  }

  function drawChart() {
    if (chartDiv) {
      chartDiv.selectAll('*').remove();
    }

    if (filteredRows) {
      height = filteredRows.length * rowHeight;
      const svg = chartDiv.append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append('svg:g')
          .attr("transform", `translate(${margin.left},${margin.top})`);

      x = d3.scaleBand()
        .domain(chartDates)
        .range([0, width]);

      y = d3.scaleBand()
        .domain(filteredRows.map(d => d.name))
        .range([0, height]);
      
      // const color = d3.scaleSequentialSqrt([d3.max(chartData.rows, d => d3.max(d.values)), 1], d3.interpolateBuPu);
      // const color = d3.scaleSequentialSqrt(t => d3.interpolateOrRd((t + 0.25) / 2))
      //     .domain([d3.max(chartData.rows, d => d3.max(d.values)), 1]);
      // const color = d3.scaleSequential([1, 500], d3.interpolateOrRd());
      // const color = d3.scaleSequential(
      //   [d3.max(filteredRows, d => d3.max(d.values)), 1], 
      //   t => d3.interpolateYlOrBr((t + 0.25) / 2));
      const color = d3.scaleSequentialSqrt([d3.max(filteredRows, d => d3.max(d.values)), 1], t => d3.interpolateOrRd((t * .75 + 0.15)));
      // const color = d3.scaleQuantize([1,500], d3.schemeBlues[9])
      // console.log(d3.schemeOrRd[9]);

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

      svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text")
          .append("title").text(d => d));

      const row = svg.append("g")
          .selectAll("g")
        .data(filteredRows)
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
          // .attr("rx", 3)
          // .attr("ry", 3)
          .attr("x", (d, i) => x(chartDates[i]))
          .attr("width", x.bandwidth() - 1)
          .attr("height", y.bandwidth() - 1)
          .attr("fill", v => isNaN(v) ? "whitesmoke" : color(v))
          // .attr("fill", v => isNaN(v) ? "whitesmoke" : v === 1 ? d3.schemeBuPu[9][8] : color(v))
          // .attr("stroke", v => v === 1 ? "black" : null)
          .on('mouseover touchover', (d, i) => {
            d3.select('.axis--x')
              .selectAll('text')
              .attr('font-weight', t => t.getTime() === chartDates[i].getTime() ? 'bold' : null);
          })
          .on('mouseout touchout', d => {
            d3.select('.axis--x')
              .selectAll('text')
              .attr('font-weight', null);
          })
        .append("title")
          .text((d, i) => `${d ? `#${d}` : 'No Ranking'} on ${formatDate(chartDates[i])}`);
      
      svg.append("g")
        .attr("transform", `translate(${width - 300}, -${margin.top})`)
        .append(() => legend({
          color,
          title: 'Top500 List Ranks',
          width: width < 300 ? width : 300,
          tickFormat: "d"
          // tickValues: [1, 20, 50, 100, 200, 300, 400, 500]
        })); 
    }
  }

  const isRowShowing = (name) => {
    for (let i = 0; i < rowFilterStrings.length; i++) {
      if (name.toLowerCase().includes(rowFilterStrings[i])) {
        return true;
      }
    }
    return false;
  }

  chart.setRowFilterStrings = function (value) {
    if (!arguments.length) {
      return rowFilterStrings;
    }

    let strings = d3.csvParseRows(value)[0];
    rowFilterStrings = [];
    if (strings) {
      strings.forEach( s => {
        if (s.trim().length > 0) {
          rowFilterStrings.push(s.trim().toLowerCase());
        }
      });
    }

    if (chartRows) {
      filteredRows = rowFilterStrings.length > 0 ? chartRows.filter(d => isRowShowing(d.name)) : chartRows;
      drawChart();
    }

    return chart;
  }

  chart.margin = function(value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right;
    // oldChartHeight = height + margin.top + margin.bottom;
    margin = value;
    width = oldChartWidth - margin.left - margin.right;
    // height = oldChartHeight - margin.top - margin.bottom;
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

  chart.rowHeight = function(value) {
    if (!arguments.length) {
      return rowHeight;
    }
    rowHeight = value;
    // height = value - margin.top - margin.bottom;
    drawChart();
    return chart;
  };

  return chart;
}