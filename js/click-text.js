var a_idx = 0;
jQuery(document).ready(function($) {
    $("body").click(function(e) {
        // 你可以自定义这里的文字
        var a = new Array("Wir müssen wissen", "Wir werden wissen", "EVA-01", "Kisara", "HITSZ", "Fisher", "Breaking Start", "Always Continut","Never Break","Never say never");
        var $i = $("<span/>").text(a[a_idx]);
        a_idx = (a_idx + 1) % a.length;
        var x = e.pageX, y = e.pageY;
        $i.css({
            "z-index": 999999,
            "top": y - 20,
            "left": x,
            "position": "absolute",
            "font-weight": "bold",
            "color": "#4dcaff", // 这里用了你主题的蓝色
            "cursor": "default",
            "user-select": "none",
            "opacity": 25
        });
        $("body").append($i);
        $i.animate({
            "top": y - 180,
            "opacity": 0
        }, 1500, function() {
            $i.remove();
        });
    });
});
