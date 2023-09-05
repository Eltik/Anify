export const handler = async (req: Request): Promise<Response> => {
    try {
        return new Response(JSON.stringify({ message: "Sample route." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    method: "GET",
    path: "/stats",
    handler,
};

export default route;
