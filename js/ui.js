const ui = (() => {
	var main = document.getElementById("overlay");
	
	var LyricDisplayer = document.getElementById("lyric");
	var LyricPlayable = false;
	var Lyrics = new Array();
		
	const performance = (() => {
		var rank = document.getElementById("rank");
		var percentage = document.getElementById("percentage");
		var score = document.getElementById("score");
		var combo = document.getElementById("combo");

		function format(number) {
			return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		return (data) => {
			score.innerText = format(data.score);
			combo.innerText = data.combo;
			rank.innerText = data.rank;
			percentage.innerText = (data.currentMaxScore > 0 ? (Math.floor((data.score / data.currentMaxScore) * 1000) / 10) : 0) + "%";
		}
	})();

	const timer = (() => {
		const radius = 30;
		const circumference = radius * Math.PI * 2;

		var bar = document.getElementById("progress");
		var text = document.getElementById("progress-text");

		var active = false;

		var began;
		var duration;

		var display;

		function format(time) {
			var minutes = Math.floor(time / 60);
			var seconds = time % 60;

			if (seconds < 10) {
				seconds = "0" + seconds;
			}

			return `${minutes}:${seconds}`;
		}

		function update(time) {
			time = time || Date.now();

			var delta = time - began;

			var progress = Math.floor(delta / 1000);
			var percentage = Math.min(delta / duration, 1);

			bar.setAttribute("style", `stroke-dashoffset: ${(1 - percentage) * circumference}px`);

			// Minor optimization
			if (progress != display) {
				display = progress;
				text.innerText = format(progress);
			}
			
			if(LyricPlayable && Lyrics.length > 0){
				if(delta / 1000 >= Lyrics[0].time){
					LyricDisplayer.innerHTML = Lyrics[0].text;
					Lyrics.shift();
				}
			}
			
		}

		function loop() {
			if (active) {
				update();
				requestAnimationFrame(loop);
			}
		}

		return {
			start(time, length) {
				active = true;
				
				began = time;
				duration = length;

				loop();
			},

			pause(time) {
				active = false;

				update(time);
			},

			stop() {
				active = false;
				began = undefined;
				duration = undefined;
			}
		}
	})();

	const beatmap = (() => {
		var cover = document.getElementById("image");

		var title = document.getElementById("title");
		var subtitle = document.getElementById("subtitle");
		var artist = document.getElementById("artist");

		var difficulty = document.getElementById("difficulty");
		var bpm = document.getElementById("bpm");
		var njs = document.getElementById("njs");
		
		function format(number) {
			if (Number.isNaN(number)) {
				return "NaN";
			}

			if (Math.floor(number) !== number) {
				return number.toFixed(2);
			}

			return number.toString();
		}
		
		function parseLyric(lrc) {
			if(lrc.length==0) return;
			var lrcs = lrc.split('\n');
			var LyricsSet = new Array();
			for(var i in lrcs) {
				lrcs[i] = lrcs[i].replace(/(^\s*)|(\s*$)/g, "");
				var t = lrcs[i].substring(lrcs[i].indexOf("[") + 1, lrcs[i].indexOf("]"));
				var s = t.split(":");
				if(!isNaN(parseInt(s[0]))) {
					var arr = lrcs[i].match(/\[(\d+:.+?)\]/g);
					var start = 0;
					for(var k in arr){
						start += arr[k].length;
					}
					var content = lrcs[i].substring(start);
					for (var k in arr){
						var t = arr[k].substring(1, arr[k].length-1);
						var s = t.split(":");
						LyricsSet.push({
							time: (parseFloat(s[0])*60+parseFloat(s[1])).toFixed(3),
							text: content
						});
					}
				}
			}
			LyricsSet.sort(function (a, b) { return a.time-b.time; });
			return LyricsSet;
		}

		return (data, time) => {
			if (data.difficulty === "ExpertPlus") {
				data.difficulty = "Expert+";
			}

			cover.setAttribute("src", `data:image/png;base64,${data.songCover}`);

			title.innerText = data.songName;
			subtitle.innerText = data.songSubName;
			
			if (data.levelAuthorName) {
				artist.innerText = `${data.songAuthorName} [${data.levelAuthorName}]`;
			} else {
				artist.innerText = data.songAuthorName;
			}
			

			difficulty.innerText = data.difficulty;
			bpm.innerText = `${format(data.songBPM)} BPM`;

			if (data.noteJumpSpeed) {
				njs.innerText = `${format(data.noteJumpSpeed)} NJS`;
			} else {
				njs.innerText = "";
			}

			timer.start(Date.now(), data.length);
			
			try {
				var q = data.songName.replace(/[\~|\`|\!|\$|\%|\^|\*|\(|\)|\+|\=|\||\\|\[|\]|\{|\}|\;|\"|\'|\,|\<|\>|\/|\?]/g,"") + " - " + data.songAuthorName.replace(/[\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]/g,"");
				console.log("Q: " + q);
				$.ajax({
					type: 'GET',
					crossDomain: true,
					dataType:'json',
					url: 'http://music.163.com/api/search/pc',
					data: "s=" + q.replace(" ", "%20") + "&limit=1&type=1",
					error: function(xhr) { console.log("Something wrong when loading lyric!!!"); },
					success: function(response){
						if(!response.hasOwnProperty("songCount")){
							var songId = response["result"]["songs"][0]["id"];
							$.ajax({
								type: 'GET',
								crossDomain: true,
								dataType:'json',
								url: 'http://music.163.com/api/song/media',
								data: "id=" + songId,
								error: function(xhr) { console.log("Something wrong when loading lyric!!!"); },
								success: function(response2){
									if(response2.hasOwnProperty("lyric")){
										Lyrics = parseLyric(response2["lyric"]);
										LyricPlayable = true;
									}
								}
							});
						}
					}
				});
			} catch (e) {
				console.log("Something wrong when loading lyric... \n" + e);
			}
		}
	})();

	return {
		hide() {
			main.classList.add("hidden");
			LyricPlayable = false;
			LyricDisplayer.innerHTML = "";
		},

		show() {
			main.classList.remove("hidden");
		},

		performance,
		timer,
		beatmap
	}
})();
