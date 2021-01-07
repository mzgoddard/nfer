(function({React: {createElement: h, render}, redux: {createStore, combineReducders}, ReactRedux: {connect}}) {
    function Editor() {}
    function SearchColumn() {}
    function EditObject() {
        return h('div', null, [
            h('details', null, [
                h('summary', null, [h('h2', null, ['name'])]),
            ]),
            h('details', null, [
                h('summary', null, [h('h3', null, ['Context'])]),
            ]),
            h('details', null, [
                h('summary', null, [h('h3', null, ['Arguments'])]),
            ]),
            h('details', null, [
                h('summary', null, [h('h3', null, ['Body'])]),
            ]),
        ]);
    }
    function Preview() {}

    // objects:
    // - titled
    //   - title
    //   - description
    // - head: titled
    //   - arguments
    //     - [key]
    //     - head
    //   - branches
    // - branch: titled
    //   - arguments
    //   - block

    function RenderObject() {}

    function serialize() {}
    function deserialize() {}
})(/** @type {any} */ (window));
