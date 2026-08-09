function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size;
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles = 2;

  // Trạng thái tiếp tục chơi sau khi đạt 2048
  this.keepPlayingState = false;
this.apiUrl = "http://localhost:7072/api/save-score";
  // Đảm bảo mỗi lần Game Over chỉ gửi điểm 1 lần
  this.scoreSaved = false;

  // API lưu điểm
    this.apiUrl = "http://localhost:7072/api/save-score";

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}


// ==========================================================
// RESTART GAME
// ==========================================================

GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();

  this.actuator.continueGame();

  this.scoreSaved = false;
  this.keepPlayingState = false;

  this.setup();
};


// ==========================================================
// TIẾP TỤC CHƠI SAU KHI ĐẠT 2048
// ==========================================================

GameManager.prototype.keepPlaying = function () {
  this.keepPlayingState = true;

  this.actuator.continueGame();
};


// ==========================================================
// KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
// ==========================================================

GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlayingState);
};


// ==========================================================
// KHỞI TẠO GAME
// ==========================================================

GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Nếu có game cũ thì khôi phục
  if (previousState) {
    this.grid = new Grid(
      previousState.grid.size,
      previousState.grid.cells
    );

    this.score = previousState.score;
    this.over = previousState.over;
    this.won = previousState.won;

    this.keepPlayingState =
      previousState.keepPlaying || false;

    this.scoreSaved = false;

  } else {

    this.grid = new Grid(this.size);

    this.score = 0;
    this.over = false;
    this.won = false;

    this.keepPlayingState = false;
    this.scoreSaved = false;

    // Thêm 2 ô ban đầu
    this.addStartTiles();
  }

  // Cập nhật giao diện
  this.actuate();
};


// ==========================================================
// THÊM CÁC Ô BAN ĐẦU
// ==========================================================

GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};


// ==========================================================
// THÊM Ô NGẪU NHIÊN
// ==========================================================

GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {

    var value = Math.random() < 0.9 ? 2 : 4;

    var tile = new Tile(
      this.grid.randomAvailableCell(),
      value
    );

    this.grid.insertTile(tile);
  }
};


// ==========================================================
// CẬP NHẬT GIAO DIỆN
// ==========================================================

GameManager.prototype.actuate = function () {

  // Cập nhật điểm cao nhất
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Nếu Game Over
  if (this.over) {

    // Xóa trạng thái game hiện tại
    this.storageManager.clearGameState();

  } else {

    // Lưu trạng thái game
    this.storageManager.setGameState(
      this.serialize()
    );
  }

  // Cập nhật giao diện
  this.actuator.actuate(
    this.grid,
    {
      score: this.score,

      over: this.over,

      won: this.won,

      bestScore:
        this.storageManager.getBestScore(),

      terminated:
        this.isGameTerminated()
    }
  );

  // ========================================================
  // GỬI ĐIỂM KHI GAME OVER
  // ========================================================

  if (this.over && !this.scoreSaved) {

    this.scoreSaved = true;

    this.saveScore();
  }
};


// ==========================================================
// LƯU TRẠNG THÁI GAME
// ==========================================================

GameManager.prototype.serialize = function () {
  return {
    grid: this.grid.serialize(),

    score: this.score,

    over: this.over,

    won: this.won,

    keepPlaying: this.keepPlayingState
  };
};


// ==========================================================
// CHUẨN BỊ TILE
// ==========================================================

GameManager.prototype.prepareTiles = function () {

  this.grid.eachCell(function (x, y, tile) {

    if (tile) {

      tile.mergedFrom = null;

      tile.savePosition();
    }
  });
};


// ==========================================================
// DI CHUYỂN TILE
// ==========================================================

GameManager.prototype.moveTile = function (tile, cell) {

  this.grid.cells[tile.x][tile.y] = null;

  this.grid.cells[cell.x][cell.y] = tile;

  tile.updatePosition(cell);
};


// ==========================================================
// DI CHUYỂN GAME
// ==========================================================

GameManager.prototype.move = function (direction) {

  // 0: Up
  // 1: Right
  // 2: Down
  // 3: Left

  var self = this;

  // Không cho di chuyển nếu game kết thúc
  if (this.isGameTerminated()) {
    return;
  }

  var cell;
  var tile;

  var vector = this.getVector(direction);

  var traversals =
    this.buildTraversals(vector);

  var moved = false;


  // Chuẩn bị tile
  this.prepareTiles();


  // Duyệt toàn bộ grid
  traversals.x.forEach(function (x) {

    traversals.y.forEach(function (y) {

      cell = {
        x: x,
        y: y
      };

      tile = self.grid.cellContent(cell);


      if (tile) {

        var positions =
          self.findFarthestPosition(
            cell,
            vector
          );

        var next =
          self.grid.cellContent(
            positions.next
          );


        // ==================================================
        // MERGE TILE
        // ==================================================

        if (
          next &&
          next.value === tile.value &&
          !next.mergedFrom
        ) {

          var merged = new Tile(
            positions.next,
            tile.value * 2
          );

          merged.mergedFrom = [
            tile,
            next
          ];


          self.grid.insertTile(merged);

          self.grid.removeTile(tile);


          // Cập nhật vị trí
          tile.updatePosition(
            positions.next
          );


          // Cộng điểm
          self.score += merged.value;


          // Âm thanh merge
          self.actuator.playMergeSound();


          // ==================================================
          // ĐẠT 2048
          // ==================================================

          if (merged.value === 2048) {

            self.won = true;
          }


        } else {

          // Di chuyển bình thường
          self.moveTile(
            tile,
            positions.farthest
          );
        }


        // Kiểm tra tile có thực sự di chuyển không
        if (
          !self.positionsEqual(
            cell,
            tile
          )
        ) {

          moved = true;
        }
      }
    });
  });


  // ========================================================
  // SAU KHI DI CHUYỂN
  // ========================================================

  if (moved) {

    // Thêm tile mới
    this.addRandomTile();


    // Kiểm tra còn nước đi không
    if (!this.movesAvailable()) {

      this.over = true;

      // Gửi điểm được thực hiện trong actuate()
    }


    // Cập nhật giao diện
    this.actuate();
  }
};


// ==========================================================
// LẤY VECTOR DI CHUYỂN
// ==========================================================

GameManager.prototype.getVector = function (direction) {

  var map = {

    0: {
      x: 0,
      y: -1
    },

    1: {
      x: 1,
      y: 0
    },

    2: {
      x: 0,
      y: 1
    },

    3: {
      x: -1,
      y: 0
    }
  };


  return map[direction];
};


// ==========================================================
// TẠO THỨ TỰ DUYỆT GRID
// ==========================================================

GameManager.prototype.buildTraversals = function (vector) {

  var traversals = {
    x: [],
    y: []
  };


  for (
    var pos = 0;
    pos < this.size;
    pos++
  ) {

    traversals.x.push(pos);

    traversals.y.push(pos);
  }


  // Nếu đi sang phải
  if (vector.x === 1) {

    traversals.x =
      traversals.x.reverse();
  }


  // Nếu đi xuống
  if (vector.y === 1) {

    traversals.y =
      traversals.y.reverse();
  }


  return traversals;
};


// ==========================================================
// TÌM VỊ TRÍ XA NHẤT
// ==========================================================

GameManager.prototype.findFarthestPosition =
  function (cell, vector) {

    var previous;


    do {

      previous = cell;

      cell = {
        x: previous.x + vector.x,
        y: previous.y + vector.y
      };

    } while (
      this.grid.withinBounds(cell) &&
      this.grid.cellAvailable(cell)
    );


    return {

      farthest: previous,

      next: cell
    };
  };


// ==========================================================
// KIỂM TRA CÒN NƯỚC ĐI
// ==========================================================

GameManager.prototype.movesAvailable = function () {

  return (
    this.grid.cellsAvailable() ||
    this.tileMatchesAvailable()
  );
};


// ==========================================================
// KIỂM TRA TILE CÓ THỂ GHÉP
// ==========================================================

GameManager.prototype.tileMatchesAvailable =
  function () {

    var self = this;

    var tile;


    for (
      var x = 0;
      x < this.size;
      x++
    ) {

      for (
        var y = 0;
        y < this.size;
        y++
      ) {

        tile =
          this.grid.cellContent({
            x: x,
            y: y
          });


        if (tile) {

          for (
            var direction = 0;
            direction < 4;
            direction++
          ) {

            var vector =
              self.getVector(direction);


            var cell = {
              x: x + vector.x,
              y: y + vector.y
            };


            var other =
              self.grid.cellContent(cell);


            if (
              other &&
              other.value === tile.value
            ) {

              return true;
            }
          }
        }
      }
    }


    return false;
  };


// ==========================================================
// SO SÁNH VỊ TRÍ
// ==========================================================

GameManager.prototype.positionsEqual =
  function (first, second) {

    return (
      first.x === second.x &&
      first.y === second.y
    );
  };


// ==========================================================
// LƯU ĐIỂM VÀO API
// ==========================================================

GameManager.prototype.saveScore = async function () {

  try {

    // ======================================================
    // LẤY TÊN NGƯỜI CHƠI
    // ======================================================

    var playerName =
      localStorage.getItem("playerName");


    // Nếu chưa có tên
    if (!playerName) {

      playerName =
        prompt(
          "Nhập tên người chơi:",
          "Duy"
        );


      // Nếu người dùng không nhập
      if (!playerName) {

        playerName = "Người chơi";
      }


      playerName =
        playerName.trim();


      // Lưu tên để lần sau không cần nhập
      localStorage.setItem(
        "playerName",
        playerName
      );
    }


    // ======================================================
    // DỮ LIỆU GỬI API
    // ======================================================

    var data = {

      playerName: playerName,

      score: this.score
    };


    console.log(
      "Đang gửi điểm:",
      data
    );


    // ======================================================
    // GỌI AZURE FUNCTION
    // ======================================================

    var response =
      await fetch(
        this.apiUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json; charset=utf-8"
          },

          body: JSON.stringify(data)
        }
      );


    // ======================================================
    // ĐỌC KẾT QUẢ
    // ======================================================

    var result =
      await response.json();


    // ======================================================
    // KIỂM TRA KẾT QUẢ
    // ======================================================

    if (response.ok && result.success) {

      console.log(
        "Lưu điểm thành công:",
        result
      );

    } else {

      console.error(
        "API không lưu được điểm:",
        result
      );
    }


  } catch (error) {

    // ======================================================
    // LỖI KẾT NỐI API
    // ======================================================

    console.error(
      "Không thể kết nối API lưu điểm:",
      error
    );
  }
};
