var rankingStringlineChart = function () {
  let margin = {top:20, right:20, bottom:20, left:20};
  let width = 900 - margin.left - margin.right;
  let height = 500 - margin.top + margin.bottom;

  var highlightStrings = [];

  let chartData;
  let chartDiv;

  let selectedLineColor = "mediumblue";
  let unselectedColor = "gray";
  let normalColor = "#222";

  let foreground;
  let background;
  let hoverData = [];
  let highlightedData = [];
  let backgroundData;
  let x;
  let y;

  let defaultBackgroundAlpha = 0.4;
  let shadowBackgroundAlpha = 0.1;

  let canvasMargin = 4;

  function chart(selection, data) {
    chartData = data.slice();
    chartDiv = selection;
    drawChart();
  }

  const isNameHighlighted = (name) => {
    for (let i = 0; i < highlightStrings.length; i++) {
      if (name.toLowerCase().includes(highlightStrings[i])) {
        return true;
      }
    }
    return false;
  };

  function drawChart() {
    if (chartDiv) {
      chartDiv.selectAll('*').remove();
    }

    if (chartData) {
      highlightedData = chartData.filter(d => isNameHighlighted(d.name));

      const backgroundCanvas = chartDiv.append('canvas')
        .attr('id', 'background')
        .attr('width', width + 1)
        .attr('height', height + 1)
        .style('position', 'absolute')
        .style('top', `${margin.top}px`)
        .style('left', `${margin.left}px`);
      background = backgroundCanvas.node().getContext('2d');
      background.strokeStyle = "rgba(0,0,0)";
      background.globalAlpha = defaultBackgroundAlpha;
      background.antialias = false;
      background.lineWidth = 1;
      background.translate(0.5, 0.5);

      const foregroundCanvas = chartDiv.append('canvas')
        .attr('id', 'foreground')
        .attr('width', width + 1)
        .attr('height', height + 1)
        .style('position', 'absolute')
        .style('top', `${margin.top}px`)
        .style('left', `${margin.left}px`);
      foreground = foregroundCanvas.node().getContext('2d');
      foreground.strokeStyle = "rgba(0,100,160)";
      foreground.globalAlpha = 1;
      foreground.antialias = true;
      foreground.lineWidth = 2;
      foreground.translate(0.5, 0.5);

      const svg = chartDiv.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style('position', 'absolute')
        .append('svg:g')
          .attr("transform", `translate(${margin.left},${margin.top})`);
      
      const dates = [...new Set(d3.merge(chartData.map(d => d.values.map(v => v.date.getTime()))))].map(d => new Date(d)).sort(d3.ascending);
      console.log(dates);
        
      x = d3.scaleTime()
        .domain(d3.extent(dates))
        .rangeRound([0, width]);

      const xAxis = g => g
          .style("font", "10px sans-serif")
        .selectAll("g")
        .data(dates)
        .join("g")
          .attr("transform", d => `translate(${x(d)},0)`)
          .call(g => g.append("line")
            .attr("y1", -6)
            .attr("y2", 0)
            .attr("stroke", "black"))
          .call(g => g.append("line")
            .attr("y1", height)
            .attr("y2", height + 6)
            .attr("stroke", "black"))
          .call(g => g.append("line")
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke-opacity", 0.3)
            .attr("stroke-dasharray", "1.5,2")
            .attr("stroke", "black"))
          .call(g => g.append("text")
            .attr("transform", `rotate(-90)`)
            .attr("x", 10)
            .attr("dy", "0.35em")
            .text(d => formatDate(d)))
          .call(g => g.append("text")
            .attr("text-anchor", "end")
            .attr("transform", `translate(0, ${height}) rotate(-90)`)
            .attr("x", -10)
            .attr("dy", "0.35em")
            .text(d => formatDate(d)));

      y = d3.scaleLinear()
        .domain([1,500])
        .range([0, height]);

      // y.ticks(y.ticks().unshift(1));

      // console.log(y.ticks());
      let ticks = y.ticks();
      ticks.unshift(1);
      console.log(ticks);

      const yAxis = g => g
        .call(d3.axisLeft(y)
          .tickValues(ticks)
          .tickFormat(x => `#${x}`))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').clone().lower()
          .attr("stroke-opacity", 0.3)
          .attr("stroke-dasharray", "1.5,2")
          .attr("stroke", "black")
          .attr("x2", width));
      
      svg.append("g")
        .call(xAxis);
      svg.append("g")
        .call(yAxis);

      // svg.append("g")
      //   // .call(d3.axisLeft(y).tickSize(0))
      //   .call(d3.axisLeft(y).tickFormat(x => `#${x}`))
      //   .call(g => g.select(".domain").remove());

        const voronoi = d3.Delaunay
        .from(ranks, d => x(d.rank.date), d => y(d.rank.value))
        .voronoi([0, 0, width, height]);
      
      const tooltip = g => {
        const tooltip = g.append("g")
          .style("font", "10px sans-serif");

        const path = tooltip.append("path")
          .attr("fill", "white")
          .attr("fill-opacity", 0.7);

        const text = tooltip.append("text");

        const line1 = text.append("tspan")
          .attr("x", 0)
          .attr("y", 0)
          .style("font-weight", "bold");
        
        const line2 = text.append("tspan")
          .attr("x", 0)
          .attr("y", "1.1em");

        const line3 = text.append("tspan")
          .attr("x", 0)
          .attr("y", "2.2em");

        g.append("g")
            .attr("fill", "none")
            .attr("pointer-events", "all")
          .selectAll("path")
          .data(ranks)
          .join("path")
            .attr("d", (d, i) => voronoi.renderCell(i))
            .on("mouseout", () => {
              tooltip.style("display", "none")
              hoverData = [];
              // foreground.globalAlpha = 0.4;
              // foreground.lineWidth = 1;
              // foregroundData = chartData;
              // backgroundData = [];
              drawLines();
            })
            .on("mouseover", d => {
              tooltip.style("display", null);
              line1.text(`${d.name.name}`);
              line2.text(`Rank: #${d.rank.value}`);
              line3.text(`${formatTooltipDate(d.rank.date)}`);
              path.attr("stroke", "black");
              const box = text.node().getBBox();
              
              if (x(d.rank.date) + box.width + 20 > width) {
                // console.log('tooltip clipped on right side');
                path.attr("d", `
                  M${box.x - 10},${box.y - 10}
                  h${box.width + 20}
                  V${box.y + (box.height / 2 - 5)}l5,5l-5,5
                  V${box.y + (box.height + 10)}
                  h-${box.width + 20}
                  z
                `);
                tooltip.attr("transform", `translate(${
                  x(d.rank.date) - box.width - 24 },${
                  y(d.rank.value) - box.height / 2 - box.y
                })`); 
              } else {
                path.attr("d", `
                  M${box.x - 10},${box.y - 10}
                  V${box.y + (box.height / 2 - 5)}l-5,5l5,5
                  V${box.y + (box.height + 10)}
                  h${box.width + 20}
                  V${box.y - 10}
                  z
                `);
                tooltip.attr("transform", `translate(${
                  x(d.rank.date) + 24 },${
                  y(d.rank.value) - box.height / 2 - box.y
                })`);  
              }
              
              // The original tooltip was below the data node
              // path.attr("d", `
              //   M${box.x - 10},${box.y - 10}
              //   H${box.width / 2 - 5}l5,-5l5,5
              //   H${box.width + 10}
              //   v${box.height + 20}
              //   h-${box.width + 20}
              //   z
              // `);
              // tooltip.attr("transform", `translate(${
              //   x(d.rank.date) - box.width / 2},${
              //   y(d.rank.value) + 28
              // })`);

              // foregroundData = [];
              // backgroundData = [];
              // foreground.globalAlpha = 1.;
              // foreground.lineWidth = 2;
              hoverData = chartData.filter(c => c.name === d.name.name);
              // chartData.map(s => {
              //   if (s.name === d.name.name) {
              //     hoverData.push(s);
              //   } else {
              //     backgroundData.push(s);
              //   }
              // });
              drawLines();
            });
      };
        
      svg.append("g")
        .call(tooltip);

      // foregroundData = chartData;

      backgroundData = chartData;
      drawLines();
      
    }
  }

  function path(data, ctx, halo=false) {
    if (halo) {
      ctx.strokeStyle = "white"
      ctx.lineWidth = ctx.lineWidth * 4;
      ctx.beginPath();

      data.values.map((d,i) => {
        if (i === 0) {
          // ctx.moveTo(x(d.date), y(d.value));
          ctx.moveTo(x(d.date)-2, y(d.value));
          ctx.lineTo(x(d.date)+2, y(d.value));
        } else {
          // ctx.lineTo(x(d.date), y(d.value));
          ctx.lineTo(x(d.date)-2, y(d.value));
          ctx.lineTo(x(d.date)+2, y(d.value));
        }
      });

      ctx.stroke();
      ctx.strokeStyle = "rgba(0,100,160)";
      ctx.lineWidth = ctx.lineWidth / 4;
    }

    // let highlighted = highlightStrings.length > 0 ? isNameHighlighted(data.name) : false;
    // let originalAlpha = ctx.globalAlpha;
    // highlighted ? ctx.globalAlpha = 1 : null;
    // console.log(highlighted);

    ctx.beginPath();

    data.values.map((d,i) => {
      if (i === 0) {
        // ctx.moveTo(x(d.date), y(d.value));
        ctx.moveTo(x(d.date)-2, y(d.value));
        ctx.lineTo(x(d.date)+2, y(d.value));
      } else {
        // ctx.lineTo(x(d.date), y(d.value));
        ctx.lineTo(x(d.date)-2, y(d.value));
        ctx.lineTo(x(d.date)+2, y(d.value));
      }
    });

    ctx.stroke();

    // highlighted ? ctx.globalAlpha = originalAlpha : null;
  }

  function drawLines() {
    drawBackground();
    drawForeground();
  }

  function drawForeground() {
    foreground.clearRect(-1, -1, width + 2, height + 2);
    if (highlightedData) {
      highlightedData.map(d => path(d, foreground, false));
    }
    if (hoverData) {
      hoverData.map(d => path(d, foreground, true));
    }
    // foregroundData.map(d => path(d, foreground, foregroundData.length !== chartData.length));
  }

  function drawBackground() {
    background.clearRect(-1, -1, width + 2, height + 2);
    if (highlightedData.length > 0 || hoverData.length > 0) {
      background.globalAlpha = shadowBackgroundAlpha;
    } else {
      background.globalAlpha = defaultBackgroundAlpha;
    }
    backgroundData.map(d => path(d, background));
  }

  chart.setHighlightStrings = function(value) {
    if (!arguments.length) {
      return highlightStrings;
    }

    let strings = d3.csvParseRows(value)[0];
    highlightStrings = [];
    if (strings) {
      strings.forEach(s => {
        if (s.trim().length > 0) {
          highlightStrings.push(s.trim().toLowerCase());
        }
      });
    }

    // update chart
    if (chartData) {
      highlightedData = chartData.filter(d => isNameHighlighted(d.name));
      // console.log(highlightedData);
      drawLines();
    }

    return chart;
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
    return chart;
  };

  chart.width = function(value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
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