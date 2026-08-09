// ==========================================================
// apl.js
// Kết nối game 2048 với Azure Functions
// ==========================================================


const API_URL =
    "http://localhost:7072/api/save-score";


const HISTORY_API_URL =
    "http://localhost:7072/api/score-history";



// ==========================================================
// LƯU TÊN NGƯỜI CHƠI
// ==========================================================

function savePlayerName() {

    const input =
        document.getElementById("playerName");

    if (!input) {

        console.error(
            "Không tìm thấy ô nhập playerName"
        );

        return;
    }


    let playerName =
        input.value.trim();


    if (!playerName) {

        alert(
            "Vui lòng nhập tên người chơi!"
        );

        input.focus();

        return;
    }


    localStorage.setItem(
        "playerName",
        playerName
    );


    console.log(
        "Đã lưu tên người chơi:",
        playerName
    );


    alert(
        "Đã lưu tên: " + playerName
    );
}



// ==========================================================
// TẢI TÊN ĐÃ LƯU
// ==========================================================

function loadPlayerName() {

    const input =
        document.getElementById("playerName");


    if (!input) {
        return;
    }


    const playerName =
        localStorage.getItem(
            "playerName"
        );


    if (playerName) {

        input.value =
            playerName;
    }
}



// ==========================================================
// LƯU ĐIỂM LÊN AZURE
// ==========================================================

async function saveScore(
    playerName,
    score
) {

    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            playerName:
                                String(
                                    playerName ||
                                    "Người chơi"
                                ).trim(),

                            score:
                                Number(score)

                        })
                }
            );


        const result =
            await response.json();


        console.log(
            "API save-score:",
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            console.error(
                "Lưu điểm thất bại:",
                result.message
            );

            return false;
        }


        console.log(
            "Lưu điểm thành công:",
            result.data
        );


        // Tải lại lịch sử sau khi lưu
        await loadScoreHistory();


        return true;


    } catch (error) {

        console.error(
            "Không thể kết nối API lưu điểm:",
            error
        );

        return false;
    }
}



// ==========================================================
// LẤY LỊCH SỬ TỪ AZURE
// ==========================================================

async function getScoreHistory() {

    try {

        const response =
            await fetch(
                HISTORY_API_URL,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const result =
            await response.json();


        console.log(
            "API score-history:",
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            console.error(
                "Không lấy được lịch sử:",
                result.message
            );

            return [];
        }


        return result.data || [];


    } catch (error) {

        console.error(
            "Không thể kết nối API lịch sử:",
            error
        );

        return [];
    }
}



// ==========================================================
// HIỂN THỊ LỊCH SỬ
// ==========================================================

async function loadScoreHistory() {

    const historyList =
        document.getElementById(
            "score-history-list"
        );


    if (!historyList) {

        console.error(
            "Không tìm thấy score-history-list"
        );

        return;
    }


    historyList.innerHTML =
        "<p>Đang tải lịch sử...</p>";


    const history =
        await getScoreHistory();


    if (!history.length) {

        historyList.innerHTML =
            "<p>Chưa có lịch sử chơi.</p>";

        return;
    }


    historyList.innerHTML = "";


    history.forEach(
        function (item) {


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "score-history-row";


            // ------------------------------
            // TÊN
            // ------------------------------

            const player =
                document.createElement(
                    "span"
                );


            player.className =
                "history-player";


            player.textContent =
                item.playerName ||
                "Người chơi";


            // ------------------------------
            // ĐIỂM
            // ------------------------------

            const score =
                document.createElement(
                    "span"
                );


            score.className =
                "history-score";


            score.textContent =
                Number(
                    item.score || 0
                );


            // ------------------------------
            // THỜI GIAN
            // ------------------------------

            const date =
                document.createElement(
                    "span"
                );


            date.className =
                "history-date";


            if (item.playedAt) {

                const playedDate =
                    new Date(
                        item.playedAt
                    );


                date.textContent =
                    playedDate.toLocaleString(
                        "vi-VN"
                    );

            } else {

                date.textContent =
                    "";
            }


            row.appendChild(
                player
            );

            row.appendChild(
                score
            );

            row.appendChild(
                date
            );


            historyList.appendChild(
                row
            );

        }
    );
}



// ==========================================================
// KHI TRANG ĐƯỢC MỞ
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {


        // Tải tên cũ
        loadPlayerName();


        // Nút Lưu tên
        const saveNameButton =
            document.getElementById(
                "savePlayerName"
            );


        if (saveNameButton) {

            saveNameButton.addEventListener(
                "click",
                savePlayerName
            );
        }


        // Nhấn Enter trong ô tên
        const nameInput =
            document.getElementById(
                "playerName"
            );


        if (nameInput) {

            nameInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        savePlayerName();
                    }

                }
            );
        }


        // Tải lịch sử Azure
        loadScoreHistory();

    }
);