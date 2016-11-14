'use strict';

window.addEventListener("load", function () {
    var important_viewpoints = {},
        mouse_down_flag = false;
    
    document.getElementById('video_data').addEventListener('click', function(event) {
        // offsetX, offsetY
        // list of events
        console.log(event);
    });
    
    document.getElementById('video_data').addEventListener('mousemove', function(event) {
        // process every frame
        if (mouse_down_flag)
            console.log(event);
    });
    
    document.getElementById('video_data').addEventListener('mousedown', function(event) {
        // save initial state
        mouse_down_flag = true;
        console.log(event);
    });
    
    document.getElementById('video_data').addEventListener('mouseup', function(event) {
        // save mouse trajectory
        mouse_down_flag = false;
        console.log(event);
    });
    
    function exportJSON() {
    }
});
