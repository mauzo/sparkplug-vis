"use strict";

const Style = {
    background:     "rgb(255,255,255)",
    circles:        "rgb(0, 200, 0)",
    lines:          "rgb(0, 255, 0)",
    packet:         "rgb(200, 0, 0)",
    text:           "rgb(0, 0, 0)",
    font:           "12px sans",
};

const Graph = {
    name: "Centre",
    children: [
        {   name: "AMRC-F2050-VIEWS",
            children: [
                {   name: "Cell_Gateway",
                    children: [
                        { name: "A11" },
                        { name: "A12" },
                    ],
                },
                {   name: "Fieldbus_Gateway",
                    children: [
                        { name: "Kuka_KR240" },
                        { name: "Pogo_Matrix" },
                        { name: "PLC" },
                        { name: "Robot_Controller" },
                        { name: "Cell" },
                    ],
                },
            ],
        },
        {   name: "B",
            children: [
                {   name: "B1" },
                {   name: "B2",
                    children: [
                        { name: "B21" },
                    ],
                },
            ],
        },
        {   name: "C",
            children: [
                {   name: "C1" },
                {   name: "C2",
                    children: [
                        { name: "C21" },
                    ],
                },
            ],
        },
        {   name: "D",
            children: [
                {   name: "D1" },
                {   name: "D2",
                    children: [
                        { name: "D21" },
                        { name: "D22" },
                        { name: "D23" },
                        { name: "D24" },
                    ],
                },
            ],
        },
        {   name: "E",
            children: [
                {   name: "E1" },
                {   name: "E2",
                    children: [
                        { name: "E21" },
                    ],
                },
            ],
        },
    ],
};

const TURN = 2*Math.PI;

function rand (from, to) {
    return Math.random() * (to - from) + from;
}

function interp (from, to, by) {
    const rv = [
        from[0]*(1 - by) + to[0]*by,
        from[1]*(1 - by) + to[1]*by,
    ];
    return rv;
}

class Packet {
    constructor (node) {
        this.node = node;
    }

    render (time, circle) {
        if (!this.start) this.start = time;
        let dT = (time - this.start) / 700;
    
        if (dT > 1) {
            this.node = this.node.parent;
            if (!this.node.parent)
                return false;
            this.start = time;
            dT = 0;
        }

        const pos = interp(this.node.centre, this.node.parent.centre, dT);
        circle(...pos, 3);
        return true;
    }
}

class Vis {
    constructor () {
        this.canvas = document.getElementById("canvas");
        this.ctx = canvas.getContext("2d");
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.radius = Math.min(this.width, this.height) / 2 - 10;

        this.active = Graph.children[0].children[0].children[0];

        this.render = this.render.bind(this);
        this.circle = this.circle.bind(this);
    }

    circle (x, y, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TURN, true);
        ctx.fill();
    }

    pick_centres (graph, centre, angle, radius, depth) {
        graph.centre = centre;
        graph.depth = depth;

        const name_w = this.ctx.measureText(graph.name).width;
        graph.label = [
            centre[0] - name_w/2, 
            centre[1] - 20/(depth+1),
            rand(-0.1, 0.1),
        ];

        const nodes = graph.children;
        if (!nodes) {
            this.leaves.push(graph);
            return;
        }

        const segments = 
            nodes.length +
            nodes.filter(n => !!n.children).length +
            (graph.depth ? 1 : 0);
        console.log(`Node ${graph.name}, segments ${segments}`);

        angle += Math.PI;
        const sector = nodes.length > 1 
            ? TURN / segments
            : rand(Math.PI/2, Math.PI*(3/2));
        for (const n of nodes) {
            const big = !!n.children;

            angle = (angle + (big ? 2 : 1)*sector) % TURN;
            const my_angle = angle + (big ? -sector/2 : 0) + rand(-0.2, 0.2);

            const limit = radius*(depth ? 0.7 : big ? 0.8 : 1)
            const len = rand(limit*0.7, limit);

            n.parent = graph;
            this.pick_centres(n,
                [centre[0] + len * Math.cos(my_angle),
                 centre[1] + len * Math.sin(my_angle)],
                my_angle, len, depth + 1);
        }
    }

    render_nodes (graph) {
        const ctx = this.ctx;
        const pos = graph.centre;
        const radius = 20 / (graph.depth + 1);

        if (graph.children) {
            for (const n of graph.children) {
                ctx.beginPath();
                ctx.moveTo(...graph.centre);
                ctx.lineTo(...n.centre);
                ctx.stroke();
                this.render_nodes(n);
            }
        }

        this.circle(pos[0], pos[1], radius);
    }

    render_text (graph) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = Style.font;
        ctx.fillStyle = Style.text;
        ctx.translate(graph.label[0], graph.label[1]);
        ctx.rotate(graph.label[2]);
        ctx.fillText(graph.name, 0, 0);
        ctx.restore();

        if (graph.children) {
            for (const n of graph.children)
                this.render_text(n);
        }
    }
    
    run () {
        this.leaves = [];
        this.ctx.font = Style.font;
        this.pick_centres(Graph, [0, 0], 0, this.radius*0.6, 0);

        this.active = new Set();
        window.requestAnimationFrame(this.render);
    }

    render (time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = Style.background;;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Style.circles;
        ctx.strokeStyle = Style.lines;
        ctx.translate(this.width/2, this.height/2);

        this.render_nodes(Graph, true);
        this.render_text(Graph);

        ctx.fillStyle = Style.packet;
        for (const [_, p] of this.active.entries()) {
            if (!p.render(time, this.circle))
                this.active.delete(p);
        }

        ctx.restore();

        if (Math.random() < 0.2) {
            const leaf = this.leaves[
                Math.trunc(Math.random() * this.leaves.length)];
            this.active.add(new Packet(leaf));
        }

        window.requestAnimationFrame(this.render);
    }
};

function main () {
    new Vis().run();
}
