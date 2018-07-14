$(function () {
    main();
});

function main() {
    //const vscode = acquireVsCodeApi();
    $("a").click((event) => {
        console.log(event.target.href);
        vscode.postMessage({
            href: event.target.href
        })
    });

    $(".interactive").click((event) => {
        console.log(event);
        if (!$(event.target).is("a") && !$(event.target).is(".detail") &&
            !$(event.target).parents(".detail").length > 0) {
            $(event.currentTarget).find(".detail").toggle(1000);
            $(event.currentTarget).find(".arrow").toggleClass("arrow-up")
        }
    });
}