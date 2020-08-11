var pcpChart = function () {
    let margin = {
        top: 20,
        right: 10,
        bottom: 20,
        left: 10
    };
    let width = 800 - margin.left - margin.right;
    let height = 300 - margin.top - margin.bottom;
    let titleText = "";
    let selectedLineOpacity = 0.15;
    let unselectedLineOpacity = 0.05;
    let showSelected = true;
    let showUnselected = true;

    let tuples;
    let svg;
    let foreground;
    let background;
    let selected;
    let unselected;
    let dimensions;
    let x;
    let y = {};
    let canvasMargin = 6;
    let axisBarWidth = 16;

    function chart(selection, data) {
        tuples = data.tuples.slice();
        dimensions = data.dimensions.slice();
        selected = tuples

        const backgroundCanvas = selection.append('canvas')
            .attr('id', 'background')
            .attr('width', width + canvasMargin * 2)
            .attr('height', height + canvasMargin * 2)
            .style('position', 'absolute')
            .style('top', `${margin.top - canvasMargin}px`)
            .style('left', `${margin.left - canvasMargin}px`)
        background = backgroundCanvas.node().getContext('2d');
        background.strokeStyle = "rgba(0,0,0)";
        background.globalAlpha = unselectedLineOpacity;
        background.antialias = false;
        background.lineWidth = 1;
        background.translate(canvasMargin + 0.5, canvasMargin + 0.5);

        const foregroundCanvas = selection.append('canvas')
            .attr('id', 'foreground')
            .attr('width', width + canvasMargin * 2)
            .attr('height', height + canvasMargin * 2)
            .style('position', 'absolute')
            .style('top', `${margin.top - canvasMargin}px`)
            .style('left', `${margin.left - canvasMargin}px`)
        foreground = foregroundCanvas.node().getContext('2d');
        foreground.strokeStyle = "rgba(0,100,160)";
        foreground.globalAlpha = selectedLineOpacity;
        foreground.antialias = true;
        foreground.lineWidth = 1.5;
        foreground.translate(canvasMargin + 0.5, canvasMargin + 0.5);

        svg = selection.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .style('position', 'absolute')
            .append('svg:g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -30)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "12")
            .text(titleText);

        x = d3.scalePoint().range([0, width]).padding(.25);
        
        let dimensionNames = [];
        dimensions.map(dim => {
            dimensionNames.push(dim.name);
            if (dim.type === 'numerical') {
                y[dim.name] = d3.scaleLinear()
                    .domain(d3.extent(tuples, d => d[dim.name])).nice();
            } else if (dim.type === 'categorical') {
                const domain = [...new Set(tuples.map(d => d[dim.name]))].sort(d3.descending);
                y[dim.name] = d3.scaleBand().domain(domain);
            } else if (dim.type === 'temporal') {
                y[dim.name] = d3.scaleTime()
                    .domain(d3.extent(tuples, d => d[dim.name])).nice();
            }

            if (y[dim.name]) {
                y[dim.name].range([height, 0])
            }

            if (dim.type === 'categorical') {
                dim.groups = d3.group(tuples, d => d[dim.name]);
            } else {
                dim.bins = d3.bin()
                    .value(d => d[dim.name])
                    (tuples);
            }
            // dim.bins = d3.histogram()
            //     .value(d => d[dim.name])
            //     .domain(y[dim.name].domain())
            //     (tuples);
        });
        x.domain(dimensionNames);
        console.log(dimensions);

        tuples.map(function (d) {
            if (showSelected) {
                path(d, foreground);
            }
        });

        // Add a group element for each dimension.
        const g = svg.selectAll(".dimension")
            .data(dimensions)
            .enter().append("g")
            .attr("class", "dimension")
            .attr("transform", function (d) {
                return `translate(${x(d.name)})`;
            });

        // drawHistogramBins();
        drawDimensions();
    }

    function drawHistogramBins () {
        svg.selectAll(".dimension").append("g")
            .attr("class", "binRect")
            .each(function (dim) {
                const histogramScale = d3.scaleLinear()
                    .range([0, dimensionScale.step()/2])
                    .domain([0, d3.max(dim.bins, d => d.length)]);
                d3.select(this).append("g")
                    .attr('fill', 'lightgray')
                    .attr('fill-opacity', 0.3)
                    .attr('stroke', 'gray')
                    .selectAll('rect')
                    .data(dim.bins)
                    .join('rect')
                        .attr('x', d => valueScale[dim.name](d.x0) + 1)
                        .attr('width', d => Math.max(0, valueScale[dim.name](d.x1) - valueScale[dim.name](d.x0) - 1))
                        .attr('y', d => -histogramScale(d.length))
                        .attr('height', d => histogramScale(d.length) - histogramScale(0))
                        .append('title')
                            .text(d => `[${d.x0}, ${d.x1}]\nCount: ${d.length}`);
            })
        
    }

    function drawDimensions () {
        const axis = d3.axisLeft();

        const g = svg.selectAll(".dimension");

        // Add an axis and title.
        g.append("g")
            .attr("class", "axis")
            .each(function (dim) {
                if (dim.type === 'numerical' || dim.type === 'temporal') {
                    d3.select(this).call(axis.scale(y[dim.name]).ticks(height / 20));
                } else {
                    let currentY = 0;
                    dim.groups.forEach((grp, key) => {
                        let grpHeight = (grp.length / tuples.length) * height;
                        // console.log(`${key}(${grp.length}), height: ${grpHeight}`);
                        // console.log(grp);
                        d3.select(this).append("rect")
                            .attr("fill", "gray")
                            .attr("stroke", "gray")
                            .attr("fill-opacity", 0.7)
                            .attr("x", -(axisBarWidth / 2))
                            .attr("width", axisBarWidth)
                            .attr("y", currentY)
                            .attr("rx", 4)
                            .attr("ry", 4)
                            .attr("height", grpHeight);
                        grp.center = currentY + (grpHeight / 2);
                        currentY = currentY + grpHeight;
                    })
                }
            })
            .append("text")
                .attr("class", "dimensionLabel")
                .attr("id", function(d) { return d.name; })
                .style("text-anchor", "middle")
                .attr("fill", "#000")
                .style("font-weight", "bold")
                .style("font-family", "sans-serif")
                .style("font-size", 11)
                .attr("y", -9)
            .text(d => d.name);
        
        // Add and store a brush for each axis.
        g.append("g")
            .attr("class", "brush")
            .each(function (d) {
                d3.select(this).call(y[d.name].brush = d3.brushY()
                    .extent([
                        [-10, 0],
                        [10, height]
                    ])
                    // .on("brush", brush)
                    .on("end", brush)
                );
            })
            .selectAll("rect")
            .attr("x", -8)
            .attr("width", 16);
        
    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
        let actives = [];
        svg.selectAll(".brush")
            .filter(function (dim) {
                y[dim.name].brushSelectionValue = d3.brushSelection(this);
                return d3.brushSelection(this);
            })
            .each(function (dim) {
                // Get extents of brush along each active selection axis (the Y axes)
                actives.push({
                    dimension: dim,
                    extent: d3.brushSelection(this).map(y[dim.name].invert)
                });
            });

        selected = [];
        unselected = [];
        console.log(actives);
        tuples.map(function (t) {
            return actives.every(function (a, i) {
                return t[a.dimension.name] <= a.extent[0] && t[a.dimension.name] >= a.extent[1];
            }) ? selected.push(t) : unselected.push(t);
        });

        drawLines();
    }

    function path(d, ctx) {
        ctx.beginPath();
        dimensions.map(function (dim, i) {
            if (i == 0) {
                if (dim.type === 'categorical') {
                    ctx.moveTo(x(dim.name) - (axisBarWidth / 2), dim.groups.get(d[dim.name]).center);
                    ctx.moveTo(x(dim.name) + (axisBarWidth / 2), dim.groups.get(d[dim.name]).center);
                } else {
                    ctx.moveTo(x(dim.name), y[dim.name](d[dim.name]));
                }
            } else {
                if (dim.type === 'categorical') {
                    ctx.lineTo(x(dim.name) - (axisBarWidth / 2), dim.groups.get(d[dim.name]).center);
                    ctx.lineTo(x(dim.name) + (axisBarWidth / 2), dim.groups.get(d[dim.name]).center);
                    // ctx.lineTo(x(dim.name), dim.groups.get(d[dim.name]).center);
                } else {
                    ctx.lineTo(x(dim.name), y[dim.name](d[dim.name]));
                }
            }
        });
        ctx.stroke();
    };

    function drawLines() {
        drawBackgroundLines();
        drawForegroundLines();
    }

    function drawForegroundLines() {
        foreground.clearRect(-canvasMargin, -canvasMargin, width + canvasMargin, height + canvasMargin);
        if (showSelected) {
            selected.map(function (d) {
                path(d, foreground);
            });
        }
    }

    function drawBackgroundLines() {
        background.clearRect(-canvasMargin, -canvasMargin, width + canvasMargin, height + canvasMargin);
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
        return chart;
    }

    chart.orientation = function (value) {
        if (!arguments.length) {
            return orientation;
        }
        orientation = value;
        return chart;
    }

    return chart;
}