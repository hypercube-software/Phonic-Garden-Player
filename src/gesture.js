const handlers = {
    onPanRight: null,
    onPanLeft: null
}

function onPanRight(handler){
    handlers.onPanRight = handler;
}
function onPanLeft(handler){
    handlers.onPanLeft = handler;
}

const body = domGet("body");
const touchStart = {
    x: -1,
    y: -1
}
const touchEnd = {
    x: -1,
    y: -1
}
body.on("touchstart",(event) => {
    if (event.changedTouches.length==1)
    {
        const touch = event.changedTouches[0];
        touchStart.x = touch.screenX;
        touchStart.y = touch.screenY;
    }
});
body.on("touchend",(event) => {
    if (event.changedTouches.length==1)
    {
        const touch = event.changedTouches[0];
        touchEnd.x = touch.screenX;
        touchEnd.y = touch.screenY;

        const direction = {
            x: touchEnd.x-touchStart.x,
            y: touchEnd.y-touchStart.y,
        }
        const threshold = window.innerWidth/4;

        if (direction.x<-threshold)
        {
            if (handlers.onPanLeft){
                handlers.onPanLeft();
            }
        }
        else if (direction.x>threshold)
        {
            if (handlers.onPanRight){
                handlers.onPanRight();
            }
        }
    }
});
