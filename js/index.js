'use strict';

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
            ? args[number]
            : match;
        });
    };
}

window.addEventListener("load", function () {
    var important_viewpoints = [],
        viewpoint_index = 0,
        mouse_down_flag = false,
        video_object,
        video_component = document.getElementById('video_data'),
        video_whole_frame,
        last_cursor_position,
        trajectory_panel = document.getElementById('viewpoint_trajectory'),
        trajectory_panel_svg,
        trajectory_line_svg = d3.line()
    .x(function(d){return d.x;})
    .y(function(d){return d.y;}),
        line_data = [],
        svg_panels = {},
        circle_click_flag = false,
        last_cursor_hover = false,
        current_line_color,
        trajectory_play = {flag: false},
        line_trajectory_prefix = 'line_trajectory_',
        table_item_prefix = 'trajectory_';
    
    var init = (function(_framerate) {
        video_object = VideoFrame({
            id: 'video_data',
            frameRate: _framerate,
            callback: function(frame) {
                // current frame number
                document.getElementById('current_frame').innerHTML = frame;
                drawTrajectory(line_data);
                
                if (trajectory_play.flag) {
                    drawTrajectoryPlay(frame);
                }
            }
        });
        
        video_whole_frame = video_object.frameRate * video_component.duration;
        document.getElementById('all_frame').innerHTML = Math.round(video_whole_frame);

        // initialize width and height of trajectory panel
        trajectory_panel.style.width = video_object.video.videoWidth;
        trajectory_panel.style.height = video_object.video.videoHeight;
        document.getElementById('video_wrapper').style.width = video_object.video.videoWidth;
        
        trajectory_panel_svg = d3.select('#viewpoint_trajectory')
        .append('svg')
        .attr('width', video_object.video.videoWidth)
        .attr('height', video_object.video.videoHeight);
        
        svg_panels.line = trajectory_panel_svg.append('g').attr('id', 'line_panel');
        svg_panels.circle = trajectory_panel_svg.append('g').attr('id', 'circle_panel');
        svg_panels.trajectory_play = trajectory_panel_svg.append('g').attr('id', 'trajectory_play_panel');
    });
    
    document.getElementById('video_fps').addEventListener('click', function(event) {
        init(document.getElementById('video_fps_value').text);
    });
    
    document.getElementById('video_play').addEventListener('click', function(event) {
        video_object.video.play();
        video_object.listen('frame');
    });
    
    document.getElementById('video_pause').addEventListener('click', function(event) {
        video_object.video.pause();
        video_object.stopListen();
    });
    
    document.getElementById('export_json').addEventListener('click', function(event) {
        exportJSON(important_viewpoints);
    });
    
    document.getElementById('trajectory_clear').addEventListener('click', function(event) {
        removeTrajectory({type:'all'});
    });
    
    video_component.addEventListener('canplay', function(event) {
        document.getElementById('video_fps_value').disabled = false;
        document.getElementById('video_fps_value').setAttribute('placeholder', 'input framerate');
    });
    
    trajectory_panel.addEventListener('mouseenter', function(event) {
        if (!video_object.video.paused) {
            video_object.video.playbackRate = 0.5;
        }
    });
    
    trajectory_panel.addEventListener('mouseleave', function(event) {
        if (!video_object.video.paused) {
            video_object.video.playbackRate = 1;

            // leave a cursor when drawing trajectory
            if (mouse_down_flag) {
                video_object.video.pause();
                last_cursor_position = {
                    x: event.offsetX,
                    y: event.offsetY
                };    
                
                // update circle
                drawLastPosition();
            }
        }
    });
    
    trajectory_panel.addEventListener('mousedown', function(event) {
        // save initial state
        // offsetX, offsetY
        // list of events
        console.log('mousedown', circle_click_flag);
        if (!circle_click_flag) {
            mouse_down_flag = true;
            viewpoint_index++;
            current_line_color = getRandomColor();
            line_data = new Array();
            important_viewpoints[viewpoint_index] = new Array();
        } else {
            circle_click_flag = false;
        }
        
        // fire mousedown when pausing video
        if (video_object.video.paused) {
            video_object.video.playbackRate = 0.5;
            video_object.video.play();
        }
    });
    
    trajectory_panel.addEventListener('mousemove', function(event) {
        // process every frame
        if (mouse_down_flag) {
            important_viewpoints[viewpoint_index].push({
                x: event.offsetX,
                y: event.offsetY,
                frame: video_object.get()
            });
            
            line_data.push({
                x: event.offsetX,
                y: event.offsetY
            });
            
            updateTrajectoryInfo(viewpoint_index);
        }
        
        if (!last_cursor_hover) {
            // show more clearly the position of cursor
            d3.select('#mouse_position').remove();
            svg_panels.line.append('circle')
            .attr('cx', event.offsetX)
            .attr('cy', event.offsetY)
            .attr('r', 5)
            .attr('fill', 'red')
            .attr('id', 'mouse_position');
        }
    });
    
    trajectory_panel.addEventListener('mouseup', function(event) {
        // save mouse trajectory
        mouse_down_flag = false;
        last_cursor_position = {
            x: event.offsetX,
            y: event.offsetY
        };
        
        // update circle
        drawLastPosition();
        video_object.video.pause();
    });
    
    function exportJSON(param) {
    }
    
    // type previous, all, specific
    function removeTrajectory(data) {
        var traj_idx = data || 
            {
                type: 'previous',
                data: -1,
                index: -1
            };
        
        switch(traj_idx.type) {
            case 'previous':
                if (important_viewpoints.length > 2) {
                    d3.selectAll('.' + line_trajectory_prefix + (important_viewpoints.length-1)).remove();
                }
                
                updateTrajectoryInfo(important_viewpoints.length-1);
                break;
            case 'specific':
                d3.selectAll(traj_idx.data).remove();
                
                important_viewpoints[traj_idx.index] = [];
                if (important_viewpoints.length-1 == traj_idx.index)
                    line_data = [];
                
                updateTrajectoryInfo(traj_idx.index);
                break;
            case 'all':
                d3.selectAll('path').remove();
                
                important_viewpoints = [];
                line_data = [];
                break;
        }
    }
    
    // call every frame 
    function drawTrajectory(data) {
        // remove line just previous frame
        // d3.selectAll('.viewpoint-trajectory').remove();
        
        // draw every line 
        line_data.reduce(function(prev, curr, curr_idx) {
            svg_panels.line.append('path')
            .attr('d', trajectory_line_svg([curr, prev]))
            .attr('stroke', current_line_color)
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('class', 'viewpoint-trajectory ' + line_trajectory_prefix + viewpoint_index);
            
            return curr;
        }, line_data[0]);
    }
    
    // call function after clicked video panel
    function drawLastPosition() {
        if (last_cursor_position) {
            d3.select('.trajectory_end').remove();
            
            svg_panels.circle.append('circle')
            .attr('cx', last_cursor_position.x)
            .attr('cy', last_cursor_position.y)
            .attr('r', 5)
            .attr('fill', 'red')
            .attr('class', 'trajectory_end')
            .on('mouseover', trajectorySnap)
            .on('mouseleave', trajectoryUnsnap)
            .on('mousedown', trajectoryStart);
        }
    }
    
    function drawTrajectoryPlay(frame) {
        if (video_object.video.currentTime > trajectory_play.end_time && trajectory_play.flag) {
            trajectory_play.flag = false;
            video_object.video.playbackRate = 1;
            video_object.video.pause();
            return;
        }
        
        important_viewpoints[trajectory_play.trajectory_index].forEach(function(elem) {
            if (elem.frame == frame) {
                 d3.select('.trajectory_play_circle').remove();
                
                svg_panels.trajectory_play.append('circle')
                .attr('cx', elem.x)
                .attr('cy', elem.y)
                .attr('r', 5)
                .attr('fill', 'red')
                .attr('class', 'trajectory_play_circle');
                return;
            }
        });
    }
    
    // mouseover for the last position of cursor
    function trajectorySnap() {
        d3.select(this)
        .attr('fill', 'orange')
        .attr('r', 10);
        last_cursor_hover = true;
    }
    
    // mouseleave for the last position of cursor
    function trajectoryUnsnap() {
        d3.select(this)
        .attr('fill', 'red')
        .attr('r', 5);
        last_cursor_hover = false;
    }
    
    // mousedown for the last positino of cursor
    // draw trajectory continuously
    function trajectoryStart() {
        console.log('circle click');
        circle_click_flag = true;
        mouse_down_flag = true;
    }
    
    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        
        return color;
    }
    
    function updateTrajectoryInfo(update_index) {
        var update_table = document.getElementById('trajectory_info'),
            table_item = '<div id="{0}" class="row valign-wrapper hoverable" style="margin-bottom:0px;border-bottom:#a3a3a3 solid 1px;padding:10px 0;">\
                    <div class="col s2">{1}</div>\
                    <div class="col s2">{2}</div>\
                    <div class="col s4">{3}</div>\
                    <div class="col s2" style="background-color:{4};height:22px;"></div>\
                    <div class="col s2"><button class="btn-floating waves-effect trajectory-play green"><i class="material-icons">play_arrow</i></button><button class="btn-floating waves-effect trajectory-remove red"><i class="material-icons">clear</i></button></div>\
                </div>';
        
        var update_item = document.getElementById(table_item_prefix + update_index);
        
        // element already exists
        if (update_item) {
            update_item.children[0].innerHTML = update_index;
            update_item.children[1].innerHTML = important_viewpoints[update_index][0].frame + '-' + important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame;
            update_item.children[2].innerHTML = video_object.toSMPTE(important_viewpoints[update_index][0].frame) + '-' + video_object.toSMPTE(important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame);
            update_item.children[3].setAttribute('style', 'background-color:' + current_line_color + ';height:22px;');
        } else {
            $(update_table).append(
                table_item.format(
                    table_item_prefix + update_index,
                    update_index,
                    important_viewpoints[update_index][0].frame + '-' + important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame,
                    video_object.toSMPTE(important_viewpoints[update_index][0].frame) + '-' + video_object.toSMPTE(important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame),
                    current_line_color
                ));
        }
    }
    
    $(document).on('click', '.trajectory-play', function(event) {
        var click_node = event.currentTarget.parentElement.parentElement;
        var click_node_id = click_node.getAttribute('id').split(table_item_prefix)[1];
        
        var start_time = video_object.toSeconds(click_node.children[2].innerHTML.split('-')[0]);
        var end_time = video_object.toSeconds(click_node.children[2].innerHTML.split('-')[1]);
        video_object.video.pause();
        video_object.video.currentTime = start_time;
        video_object.video.play();
        
        trajectory_play = {
            flag: true,
            trajectory_index: click_node_id,
            start_time: start_time,
            end_time: end_time
        };
    });

    $(document).on('click', '.trajectory-remove', function(event) {
        var click_node = event.currentTarget.parentElement.parentElement.getAttribute('id').split(table_item_prefix)[1];
        event.currentTarget.parentElement.parentElement.remove();
        
        removeTrajectory({
            type: 'specific',
            data: '.' + line_trajectory_prefix + click_node,
            index: click_node
        });
    });
});
