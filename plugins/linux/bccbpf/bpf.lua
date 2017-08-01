#!/usr/bin/env bcc-lua

local ffi = require("ffi")
local json = require("dkjson")
local bpf_preamble = require("circll").text

local mods = {
  bio = require("mod_biolatency"),
  runq = require("mod_runqlat"),
  syscall = require("mod_syscall"),
}
local INTERVAL = tonumber(arg[1]) or 60

ffi.cdef "unsigned int sleep(unsigned int seconds);"

local function submit_nad(metrics)
  io.stdout:write(json.encode(metrics))
  io.stdout:write("\n\n")
  io.stdout:flush()
end

return function(BPF)
  -- submit an empty record, so that we don't block nad on stratup
  submit_nad({})

  local BPF_TEXT = bpf_preamble
  for mod_name, mod in pairs(mods) do
    BPF_TEXT = BPF_TEXT .. mod.text .. "\n"
  end

  local bpf = BPF:new{ text=BPF_TEXT, debug=0 }

  for mod_name, mod in pairs(mods) do
    mod:init(bpf)
  end

  -- output
  while(true) do
    ffi.C.sleep(INTERVAL)
    local metrics = {}
    for mod_name, mod in pairs(mods) do
      for metric_name, val in pairs(mod:pull()) do
        metrics[mod_name .. '`' .. metric_name] = val
      end
    end
    submit_nad(metrics)
  end
end
