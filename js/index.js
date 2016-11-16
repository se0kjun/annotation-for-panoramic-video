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
        line_data = [];
    
    var init = (function(_framerate) {
        video_object = VideoFrame({
            id: 'video_data',
            frameRate: _framerate,
            callback: function(frame) {
                // current frame number
                document.getElementById('current_frame').innerHTML = frame;
                drawTrajectory(line_data);
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
            }
        }
    });
    
    trajectory_panel.addEventListener('mousedown', function(event) {
        // save initial state
        // offsetX, offsetY
        // list of events
        mouse_down_flag = true;
        viewpoint_index++;
        line_data = new Array();
        important_viewpoints[viewpoint_index] = new Array();
        
        if (video_object.video.paused) {
            video_object.video.playbackRate = 0.5;
            video_object.video.play();
        }
    });
    
    trajectory_panel.addEventListener('mousemove', function(event) {
        // process every frame
        if (mouse_down_flag) {
            console.log(event);
            important_viewpoints[viewpoint_index].push({
                x: event.offsetX,
                y: event.offsetY,
                frame: video_object.get()
            });
            
            line_data.push({
                x: event.offsetX,
                y: event.offsetY
            });
        }
    });
    
    trajectory_panel.addEventListener('mouseup', function(event) {
        // save mouse trajectory
        mouse_down_flag = false;
        last_cursor_position = {
            x: event.offsetX,
            y: event.offsetY
        };
        
        console.log(event);
    });
    
    function exportJSON(param) {
    }
    
    function drawTrajectory(data) {
        var line_panel = trajectory_panel_svg.append('g');
        
        // draw every line 
        line_data.reduce(function(prev, curr, curr_idx) {
            line_panel.append('path')
            .attr('d', trajectory_line_svg([curr, prev]))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('id', curr_idx);
            
            return curr;
        }, line_data[0]);
        
        if (last_cursor_position) {
            d3.select('.trajectory_end').remove();
            
            line_panel.append('circle')
            .attr('cx', last_cursor_position.x)
            .attr('cy', last_cursor_position.y)
            .attr('r', 5)
            .attr('fill', 'red')
            .attr('class', 'trajectory_end')
            .on('mouseover', trajectorySnap)
            .on('mouseleave', trajectoryUnsnap);
        }
    }
    
    function trajectorySnap(elem) {
        d3.select(this)
        .attr('fill', 'green');
    }
    
    function trajectoryUnsnap(elem) {
        console.log(this);
        d3.select(this)
        .attr('fill', 'red');        
    
    function updateTrajectoryInfo(update_index) {
        var update_table = document.getElementById('trajectory_info'),
            table_item = '<div id="{0}" class="row valign-wrapper">\
                    <div class="col s2">{1}</div>\
                    <div class="col s2">{2}</div>\
                    <div class="col s4">{3}</div>\
                    <div class="col s4" style="background-color:{4};height:22px;"></div>\
                </div>';
        
        var prefix = 'trajectory_',
            update_item = document.getElementById(prefix + update_index);
        
        // element already exists
        if (update_item) {
            update_item.children[0].innerHTML = update_index;
            update_item.children[1].innerHTML = important_viewpoints[update_index][0].frame + '-' + important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame;
            update_item.children[2].innerHTML = video_object.toSMPTE(important_viewpoints[update_index][0].frame) + '-' + video_object.toSMPTE(important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame);
            update_item.children[3].setAttribute('style', 'background-color:' + current_line_color + ';height:22px;');
        } else {
            $(update_table).append(
                table_item.format(
                    prefix + update_index,
                    update_index,
                    important_viewpoints[update_index][0].frame + '-' + important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame,
                    video_object.toSMPTE(important_viewpoints[update_index][0].frame) + '-' + video_object.toSMPTE(important_viewpoints[update_index][important_viewpoints[update_index].length - 1].frame),
                    current_line_color
                ));            
        }
    }
});
