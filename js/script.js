document.addEventListener("DOMContentLoaded", function () {
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    setupProfilePhoto();
    loadTrackerData();
});

const TRACKER_ROOT = "https://konner-softball-tracker.mitchelld659724.chatgpt.site";
const TRACKER_FEED = TRACKER_ROOT + "/api/public-stats";
const PROFILE_PHOTO = TRACKER_ROOT + "/api/profile-photo";

function setupProfilePhoto() {
    const photo = document.getElementById("profilePhoto");
    const placeholder = document.getElementById("profilePhotoPlaceholder");
    const button = document.getElementById("changePhotoButton");
    const input = document.getElementById("photoFile");
    const message = document.getElementById("photoMessage");

    function showLatestPhoto() {
        photo.onload = function () { photo.hidden = false; placeholder.hidden = true; };
        photo.onerror = function () { photo.hidden = true; placeholder.hidden = false; };
        photo.src = PROFILE_PHOTO + "?v=" + Date.now();
    }

    showLatestPhoto();
    button.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", async function () {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { message.textContent = "Please choose a photo smaller than 5 MB."; return; }
        const pin = window.prompt("Enter the family PIN to change Konner’s photo:");
        if (pin === null) { input.value = ""; return; }
        button.disabled = true;
        message.textContent = "Uploading photo…";
        try {
            const response = await fetch(PROFILE_PHOTO, { method: "POST", headers: { "content-type": file.type, "x-photo-pin": pin }, body: file });
            const result = await response.json().catch(function () { return {}; });
            if (!response.ok) throw new Error(result.error || "Photo upload failed");
            message.textContent = "Profile photo updated.";
            showLatestPhoto();
        } catch (error) {
            message.textContent = error.message || "Photo upload failed. Please try again.";
        } finally {
            button.disabled = false;
            input.value = "";
        }
    });
}

const statLabels = {
    hitting: [["hits", "Hits"], ["singles", "Singles"], ["doubles", "Doubles"], ["triples", "Triples"], ["homeRuns", "Home Runs"], ["walks", "Walks"], ["strikeouts", "Strikeouts"], ["outs", "Other Outs"], ["fouls", "Fouls"], ["plateAppearances", "Plate Appearances"]],
    pitching: [["pitches", "Pitches"], ["strikes", "Strikes"], ["balls", "Balls"], ["strikeouts", "Strikeouts"], ["walks", "Walks"], ["hitsAllowed", "Hits Allowed"], ["outs", "Outs"]]
};

function makeStatCard(value, label) {
    const card = document.createElement("div");
    card.className = "stat-card";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    card.append(strong, span);
    return card;
}

function renderStats(containerId, stats, labels) {
    const container = document.getElementById(containerId);
    container.replaceChildren(...labels.map(([key, label]) => makeStatCard(stats[key], label)));
}

function formatDate(value) {
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    return new Date(normalized).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function makeGameCard(game) {
    const card = document.createElement("article");
    card.className = "game-card";

    const head = document.createElement("div");
    head.className = "game-card-head";
    const identity = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = `vs. ${game.opponent}`;
    const date = document.createElement("time");
    date.textContent = formatDate(game.startedAt);
    identity.append(title, date);
    const score = document.createElement("div");
    score.className = "game-score " + (game.score.our > game.score.opponent ? "win" : game.score.our < game.score.opponent ? "loss" : "tie");
    score.textContent = `${game.score.our} – ${game.score.opponent}`;
    head.append(identity, score);

    const details = document.createElement("div");
    details.className = "game-details";
    const hitting = document.createElement("div");
    const hittingTitle = document.createElement("h4");
    hittingTitle.textContent = "Hitting";
    const hittingLine = document.createElement("p");
    hittingLine.textContent = `${game.hitting.hits} H, ${game.hitting.singles} 1B, ${game.hitting.doubles} 2B, ${game.hitting.triples} 3B, ${game.hitting.homeRuns} HR, ${game.hitting.walks} BB, ${game.hitting.strikeouts} K, ${game.hitting.fouls} fouls`;
    hitting.append(hittingTitle, hittingLine);
    const pitching = document.createElement("div");
    const pitchingTitle = document.createElement("h4");
    pitchingTitle.textContent = "Pitching";
    const pitchingLine = document.createElement("p");
    pitchingLine.textContent = `${game.pitching.pitches} pitches, ${game.pitching.strikes} strikes, ${game.pitching.strikeouts} K, ${game.pitching.walks} BB, ${game.pitching.hitsAllowed} H allowed, ${game.pitching.outs} outs`;
    pitching.append(pitchingTitle, pitchingLine);
    details.append(hitting, pitching);
    card.append(head, details);
    return card;
}

async function loadTrackerData() {
    const status = document.getElementById("statsStatus");
    try {
        const response = await fetch(TRACKER_FEED, { cache: "no-store" });
        if (!response.ok) throw new Error("Tracker unavailable");
        const data = await response.json();

        document.getElementById("recordWins").textContent = data.record.wins;
        document.getElementById("recordLosses").textContent = data.record.losses;
        document.getElementById("recordTies").textContent = data.record.ties;
        renderStats("hittingStats", data.season.hitting, statLabels.hitting);
        renderStats("pitchingStats", data.season.pitching, statLabels.pitching);

        const live = data.games.find(game => game.status === "live");
        const liveContainer = document.getElementById("liveGame");
        if (live) {
            liveContainer.hidden = false;
            liveContainer.replaceChildren();
            const label = document.createElement("strong");
            label.textContent = "LIVE GAME";
            const line = document.createElement("div");
            line.textContent = `Konner's Team ${live.score.our} – ${live.score.opponent} ${live.opponent}`;
            liveContainer.append(label, line);
        }

        const completedGames = data.games.filter(game => game.status === "final");
        const history = document.getElementById("gameHistory");
        history.replaceChildren(...(completedGames.length ? completedGames.map(makeGameCard) : [makeStatCard("No completed games yet", "Game history will appear here") ]));
        status.textContent = `Updated automatically from the game tracker • ${new Date(data.updatedAt).toLocaleString()}`;
    } catch {
        status.textContent = "Live statistics are temporarily unavailable. Please check again shortly.";
        document.getElementById("gameHistory").textContent = "Game results are temporarily unavailable.";
    }
}
