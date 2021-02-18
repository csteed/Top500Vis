var rankingStringlineChart = function () {
  let margin = {top:20, right:20, bottom:20, left:20};
  let width = 900 - margin.left - margin.right;
  let height = 500 - margin.top + margin.bottom;

  var highlightStrings = [];

  let chartData;
  let ranks;
  let chartDiv;

  let foregroundLineColor = "mediumblue";
  let unselectedColor = "gray";
  let backgroundLineColor = "#222";

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
  let dates;

  function chart(selection, data) {
    chartData = data.slice();
    chartDiv = selection;
    ranks = d3.merge(chartData.map(d => d.values.map(s => ({name: d, rank: s}))));

    chartData.map(d => {
      const values = d.values.map(v => v.value);
      d.mean = Math.round(d3.mean(values));
      d.min = d3.min(values);
      d.max = d3.max(values);
    });

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
        .attr('width', width + canvasMargin * 2)
        .attr('height', height + canvasMargin * 2)
        .style('position', 'absolute')
        .style('top', `${margin.top - canvasMargin}px`)
        .style('left', `${margin.left - canvasMargin}px`);
      background = backgroundCanvas.node().getContext('2d');
      // background.strokeStyle = "rgba(0,0,0)";
      background.strokeStyle = backgroundLineColor;
      background.globalAlpha = defaultBackgroundAlpha;
      background.antialias = false;
      background.lineWidth = 1;
      background.translate(canvasMargin + 0.5, canvasMargin + 0.5);

      const foregroundCanvas = chartDiv.append('canvas')
        .attr('id', 'foreground')
        .attr('width', width + canvasMargin * 2)
        .attr('height', height + canvasMargin * 2)
        .style('position', 'absolute')
        .style('top', `${margin.top - canvasMargin}px`)
        .style('left', `${margin.left - canvasMargin}px`);
      foreground = foregroundCanvas.node().getContext('2d');
      // foreground.strokeStyle = "rgba(0,100,160)";
      foreground.strokeStyle = foregroundLineColor;
      foreground.globalAlpha = 1;
      foreground.antialias = true;
      foreground.lineWidth = 2;
      foreground.translate(canvasMargin + 0.5, canvasMargin + 0.5);

      const svg = chartDiv.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style('position', 'absolute')
        .append('svg:g')
          .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // svg.append("rect")
      //   // .attr("x", -margin.left)
      //   // .attr("y", -margin.top)
      //   .attr("width", width)
      //   .attr("height", height)
      //   .attr("fill", "white")
      //   .attr("stroke", "none")
      //   .lower();

      dates = [...new Set(d3.merge(chartData.map(d => d.values.map(v => v.date.getTime()))))].map(d => new Date(d)).sort(d3.ascending);
      // console.log(dates);
        
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
        .domain([1, d3.max(ranks, d => d.rank.value)])
        .range([0, height]);

      let ticks = y.ticks();
      ticks.unshift(1);

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
              drawLines();
            })
            .on("mouseover", d => {
              tooltip.style("display", null);
              line1.text(`${d.name.name}`);
              line2.text(`Rank (${formatTooltipDate(d.rank.date)}): #${d.rank.value}`);
              line3.text(`Mean: ${d.name.mean}, Min: ${d.name.min}, Max: ${d.name.max}`);
              path.attr("stroke", "black");
              const box = text.node().getBBox();
              
              if (x(d.rank.date) + box.width + 20 > width) {
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
              
              hoverData = chartData.filter(c => c.name === d.name.name);
              drawLines();
            });
      };
        
      svg.append("g")
        .call(tooltip);

      backgroundData = chartData;
      drawLines();      
    }
  }

  function path(data, ctx, halo=false) {
    if (halo) {
      let previousStrokeStyle = ctx.strokeStyle;
      ctx.strokeStyle = "white"
      ctx.lineWidth = ctx.lineWidth * 4;
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      data.values.map((d,i) => {
        if (i === 0) {
          ctx.moveTo(x(d.date)-2, y(d.value));
          ctx.lineTo(x(d.date)+2, y(d.value));
        } else {
          ctx.lineTo(x(d.date)-2, y(d.value));
          ctx.lineTo(x(d.date)+2, y(d.value));
        }
      });

      ctx.stroke();
      ctx.strokeStyle = previousStrokeStyle;
      ctx.lineWidth = ctx.lineWidth / 4;
      ctx.globalAlpha = previousAlpha;
    }

    data.values.map((d,i) => {
      // console.log(dates.findIndex(date => date.getTime() === d.date.getTime()));
      if (i !== 0) {
        const prev_date_idx = dates.findIndex(date => date.getTime() === data.values[i-1].date.getTime());
        const date_idx = dates.findIndex(date => date.getTime() === d.date.getTime());
        
        ctx.beginPath();    
        const previousLineWidth = ctx.lineWidth;
        if (date_idx === prev_date_idx + 1) {
          // ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else {
          ctx.lineWidth = 1;
          ctx.setLineDash([2,4]);
        }
        ctx.moveTo(x(data.values[i-1].date)+3, y(data.values[i-1].value));
        ctx.lineTo(x(d.date)-3, y(d.value));
        ctx.stroke();
        ctx.lineWidth = previousLineWidth;
      }
      ctx.beginPath();
      ctx.setLineDash([]);
      // ctx.lineWidth = 2;
      ctx.moveTo(x(d.date)-3, y(d.value));
      ctx.lineTo(x(d.date)+3, y(d.value));
      ctx.stroke();
    });
    
    // ctx.beginPath();
    // data.values.map((d,i) => {
    //   // console.log(dates.findIndex(date => date.getTime() === d.date.getTime()));
    //   if (i === 0) {
    //     ctx.moveTo(x(d.date)-2, y(d.value));
    //     ctx.lineTo(x(d.date)+2, y(d.value));
    //   } else {
    //     const prev_date_idx = dates.findIndex(date => date.getTime() === data.values[i-1].date.getTime());
    //     const date_idx = dates.findIndex(date => date.getTime() === d.date.getTime());
        
    //     if (date_idx === prev_date_idx + 1) {
    //       ctx.lineTo(x(d.date)-2, y(d.value));
    //       ctx.lineTo(x(d.date)+2, y(d.value));
    //     } else {
    //       ctx.moveTo(x(d.date)-2, y(d.value));
    //       ctx.lineTo(x(d.date)+2, y(d.value));
    //     }
    //   }
    // });
    // ctx.stroke();
  }

  function drawLines() {
    drawBackground();
    drawForeground();
  }

  function drawForeground() {
    foreground.clearRect(-canvasMargin, -canvasMargin, width + canvasMargin * 2, height + canvasMargin * 2);
    if (highlightedData) {
      foreground.lineWidth = 1;
      highlightedData.map(d => path(d, foreground, false));
    }
    if (hoverData) {
      foreground.lineWidth = 2;
      hoverData.map(d => path(d, foreground, true));
    }
    // foregroundData.map(d => path(d, foreground, foregroundData.length !== chartData.length));
  }

  function drawBackground() {
    background.clearRect(-canvasMargin, -canvasMargin, width + canvasMargin * 2, height + canvasMargin * 2);
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