'use strict';

window.addEventListener("load", function () {
    var important_viewpoints = [],
        viewpoint_index = 0,
        mouse_down_flag = false,
        video_object,
        video_component,
        video_whole_frame,
        last_cursor_position,
        trajectory_panel,
        trajectory_panel_svg,
        trajectory_line_svg = d3.line()
    .x(function(d){return d.x;})
    .y(function(d){return d.y;}),
        line_data = [];
    
    (function init() {
        video_object = VideoFrame({
            id: 'video_data',
            frameRate: 23.98,
            callback: function(frame) {
                // current frame number
                document.getElementById('current_frame').innerHTML = frame;
            }
        });
        
        video_component = document.getElementById('video_data');
        video_whole_frame = video_object.frameRate * video_component.duration;
        document.getElementById('all_frame').innerHTML = Math.round(video_whole_frame);

        // initialize width and height of trajectory panel
        trajectory_panel = document.getElementById('viewpoint_trajectory');
        trajectory_panel.style.width = video_object.video.videoWidth;
        trajectory_panel.style.height = video_object.video.videoHeight;
        
        trajectory_panel_svg = d3.select('#viewpoint_trajectory')
        .append('svg')
        .attr('width', video_object.video.videoWidth)
        .attr('height', video_object.video.videoHeight);
    })();
    
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
            drawTrajectory(line_data);
        }
    });
    
    trajectory_panel.addEventListener('mouseup', function(event) {
        // save mouse trajectory
        mouse_down_flag = false;
        console.log(event);
    });
    
    function exportJSON() {
    }
});
