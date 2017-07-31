--
-- BPF circllhist helper
--

local circll = {}

circll.text = [[

typedef struct {
  s8 val;
  s8 exp;
} circll_bin_t;

#define LLN() if(v > 100) { exp++; v /= 10; } else goto good;
#define LLN2() LLN() LLN()
#define LLN4() LLN2() LLN2()
#define LLN8() LLN4() LLN4()
#define LLN16() LLN8() LLN8()
#define LLN32() LLN16() LLN16()
#define LLN64() LLN32() LLN32()
#define LLN128() LLN64() LLN64()

static circll_bin_t circll_bin(u64 v, s8 exp_offset) {
  s8 exp = 1;
  if(v == 0) return (circll_bin_t)  {.val = 0,    .exp = 0 + exp_offset};
  if(v < 10) return (circll_bin_t)  {.val = v*10, .exp = 1 + exp_offset};
  LLN128()
  if(v > 100) return (circll_bin_t) {.val = -1,   .exp = 0 + exp_offset};
 good:
  return (circll_bin_t) {.val = v, .exp = exp + exp_offset};
}
]]

circll.bin = function(circll_bin)
  return circll_bin.val * 10.0 ^ (circll_bin.exp - 1)
end

-- this should really be in bcc
circll.clear = function(hash)
  -- don't interate over hash table we are mutating
  local keys = {}
  for k,v in hash:items() do
    keys[#keys+1] = k
  end
  for _,k in ipairs(keys) do
    hash:delete(k)
  end
end

local mt_hist = {
  __index = {
    add = function(self, slot, val, exp_offset)
      local bin = circll.bin(slot, exp_offset)
      local cnt = tonumber(val)
      self._value[#(self._value) + 1] = string.format("H[%.1e]=%d", bin, cnt)
      return self
    end,
  }
}

circll.hist = function()
  return setmetatable({ _type = "n", _value = {} }, mt_hist)
end

return circll
