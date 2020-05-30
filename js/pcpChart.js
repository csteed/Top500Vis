var pcpChart = function () {
  let margin = {
    top: 20,
    right: 10,
    bottom: 20,
    left: 10
  };
  let width = 800 - margin.left - margin.right;
  let height = 300 - margin.top - margin.bottom;
  let titleText;
  let selectedLineOpacity = 0.15;
  let unselectedLineOpacity = 0.05;
  let showSelected = true;
  let showUnselected = true;

  let chartData;
  let svg;
  let foreground;
  let background;
  let selected;
  let unselected;
  let dimensions;
  let x;
  let y;

  function chart(selection, data) {
    chartData = data.tuples;
    dimensions = data.dimensions;

    selected = chartData;

    x = d3.scalePoint().range([0, width]).padding(.25);
    y = {};

    const backgroundCanvas = selection.append('canvas')
      .attr('id', 'background')
      .attr('width', width + 1)
      .attr('height', height + 1)
      .style('position', 'absolute')
      .style('top', `${margin.top}px`)
      .style('left', `${margin.left}px`)
    background = backgroundCanvas.node().getContext('2d');
    background.strokeStyle = "rgba(0,0,0)";
    background.globalAlpha = unselectedLineOpacity;
    background.antialias = false;

    const foregroundCanvas = selection.append('canvas')
      .attr('id', 'foreground')
      .attr('width', width + 1)
      .attr('height', height + 1)
      .style('position', 'absolute')
      .style('top', `${margin.top}px`)
      .style('left', `${margin.left}px`)
    foreground = foregroundCanvas.node().getContext('2d');
    foreground.strokeStyle = "rgba(0,100,160)";
    foreground.globalAlpha = selectedLineOpacity;
    foreground.antialias = true;

    svg = selection.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('position', 'absolute')
      .append('svg:g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -30)
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "12")
      .text(titleText);

    let dimensionNames = [];
    dimensions.forEach(dimension => {
      dimensionNames.push(dimension.name);
      if (dimension.type === 'numerical') {
        y[dimension.name] = d3.scaleLinear()
          .domain(d3.extent(chartData, d => d[dimension.name]));
      } else if (dimension.type === 'categorical') {
        const domain = [...new Set(chartData.map(d => d[dimension.name]))].sort(d3.descending);
        y[dimension.name] = d3.scaleBand().domain(domain);
      } else if (dimension.type === 'temporal') {
        y[dimension.name] = d3.scaleTime()
          .domain(d3.extent(chartData, d => d[dimension.name]));
      }
      if (y[dimension.name]) {
        y[dimension.name].range([height, 0]);
      }
    })
    x.domain(dimensionNames);
    // x.domain(dimensions = d3.keys(chartData[0]).filter(d => {
    //   if (chartData[0][d] instanceof Date) {
    //     return y[d] = d3.scaleTime()
    //       .domain(d3.extent(chartData, p => p[d]))
    //       .range([height, 0]);
    //   } else {
    //     return y[d] = d3.scaleLinear()
    //       .domain(d3.extent(chartData, p => p[d]))
    //       .range([height, 0]);
    //   }
    // }));
    console.log(dimensions);

    chartData.map(d => {
      if (showSelected) {
        path(d, foreground);
      }
    });

    drawDimensionAxes();
  }

  function drawDimensionAxes () {
    const axis = d3.axisLeft();
    
    // Add a group element for each dimension.
    console.log(dimensions);
    const g = svg.selectAll(".dimension")
      .data(dimensions)
      .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function (d) {
        console.log(d);
        return "translate(" + x(d.name) + ")";
      });

    // Add an axis and title.
    g.append("g")
      .attr("class", "axis")
      .each(function (d) {
        d3.select(this).call(axis.scale(y[d.name]));
      })
      .append("text")
          .attr("class", "dimensionLabel")
          .attr("id", function(d) { return d.name; })
          .style("text-anchor", "middle")
          .attr("fill", "black")
          .style("font-weight", "bold")
          .style("font-family", "sans-serif")
          .style("font-size", 10)
          .attr("y", -9)
        .text(d => {
          return d.name
        });

    // Add and store a brush for each axis.
    g.append("g")
      .attr("class", "brush")
      .each(function (d) {
        d3.select(this).call(y[d.name].brush = d3.brushY()
          .extent([
            [-10, 0],
            [10, height]
          ])
          .on("brush", brush)
          .on("end", brush)
        )
      })
      .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    let actives = [];
    svg.selectAll(".brush")
      .filter(function (d) {
        y[d].brushSelectionValue = d3.brushSelection(this);
        return d3.brushSelection(this);
      })
      .each(function (d) {
        // Get extents of brush along each active selection axis (the Y axes)
        actives.push({
          dimension: d,
          extent: d3.brushSelection(this).map(y[d].invert)
        });
      });

    selected = [];
    unselected = [];
    chartData.map(function (d) {
      return actives.every(function (p, i) {
        return d[p.dimension] <= p.extent[0] && d[p.dimension] >= p.extent[1];
      }) ? selected.push(d) : unselected.push(d);
    });

    drawLines();
  }

  function path(d, ctx) {
    ctx.beginPath();
    dimensions.map(function (dim, i) {
      if (i == 0) {
        ctx.moveTo(x(dim.name), y[dim.name](d[dim.name]));
      } else {
        ctx.lineTo(x(dim.name), y[dim.name](d[dim.name]));
      }
    });
    ctx.stroke();
  };

  function drawLines() {
    drawBackgroundLines();
    drawForegroundLines();
  }

  function drawForegroundLines() {
    foreground.clearRect(0, 0, width + 1, height + 1);
    if (showSelected) {
      selected.map(function (d) {
        path(d, foreground);
      });
    }
  }

  function drawBackgroundLines() {
    background.clearRect(0, 0, width + 1, height + 1);
    if (showUnselected) {
      unselected.map(function (d) {
        path(d, background);
      });
    }
  }

  chart.width = function (value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
    return chart;
  }

  chart.height = function (value) {
    if (!arguments.length) {
      return height;
    }
    height = value - margin.top - margin.bottom;
    return chart;
  }

  chart.titleText = function (value) {
    if (!arguments.length) {
      return titleText;
    }
    titleText = value;
    return chart;
  }

  chart.showSelectedLines = function (value) {
    if (!arguments.length) {
      return showSelected;
    }
    showSelected = value;
    if (foreground) {
      drawLines();
    }
    return chart;
  }

  chart.showUnselectedLines = function (value) {
    if (!arguments.length) {
      return showUnselected;
    }
    showUnselected = value;
    if (background) {
      drawLines();
    }
    return chart;
  }

  chart.selectedLineOpacity = function (value) {
    if (!arguments.length) {
      return selectedLineOpacity;
    }
    selectedLineOpacity = value;
    if (foreground) {
      foreground.globalAlpha = selectedLineOpacity;
      drawForegroundLines();
    }
    return chart;
  }

  chart.unselectedLineOpacity = function (value) {
    if (!arguments.length) {
      return unselectedLineOpacity;
    }
    unselectedLineOpacity = value;
    if (background) {
      background.globalAlpha = unselectedLineOpacity;
      drawBackgroundLines();
    }
    return chart;
  }

  chart.margin = function (value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right
    oldChartHeight = height + margin.top + margin.bottom
    margin = value;
    width = oldChartWidth - margin.left - margin.right
    height = oldChartHeight - margin.top - margin.bottom
    // resizeChart();
    return chart;
  }

  return chart;
}