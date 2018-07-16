$(function () {
    main();
});

function main() {
    // const vscode = acquireVsCodeApi();
    $("a").click((event) => {
        console.log(event.target.href);
        vscode.postMessage({
            href: event.target.href
        })
    });

    $(".interactive").click((event) => {
        console.log(event);
        if (!$(event.target).is("a") && !$(event.target).is(".detail") &&
            $(event.target).parents(".detail").length === 0) {
            $(event.currentTarget).find(".detail").toggle(1000);
            $(event.currentTarget).find(".arrow").toggleClass("arrow-up")
        }
    });

    $(window).scroll(() => {
        let offset = 250;
        let duration = 600;
        if ($(this).scrollTop() >= offset) {
            $('#back-to-top').fadeIn(duration);
        } else {
            $('#back-to-top').fadeOut(duration);
        }
    });
}